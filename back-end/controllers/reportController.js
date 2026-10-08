const db = require("../config/db");

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
};
const getDateRange = (req) => {
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0,10);
  if (!req.query.start_date && !req.query.end_date) return {startDate: `${today.slice(0,7)}-01`,endDate:today};
  const {start_date:startDate,end_date:endDate}=req.query;
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) return null;
  return { startDate, endDate };
};

/* |||| ADMIN - AUTOMATIC REPORT All values are calculated directly from the database. |||| */
exports.getReports = async (req, res) => {
  const range = getDateRange(req);
  if (!range) return res.status(400).json({message:"Enter a valid report date range."});
  const { startDate, endDate } = range;
  const group = req.query.group === "day" ? "day" : "month";
  const procedure = req.query.procedure || "";

  const visitWhere = `
        v.visit_date BETWEEN ? AND ?
        ${procedure ? "AND v.procedure_name = ?" : ""}
    `;

  const visitParams = procedure
    ? [startDate, endDate, procedure]
    : [startDate, endDate];

  const summarySql = `SELECT
    (SELECT COUNT(*) FROM patients) AS totalPatients,
    COUNT(*) AS totalVisits,
    COALESCE(SUM(v.amount_paid),0) AS totalRevenue,
    COALESCE(SUM(v.balance),0) AS outstandingBalance
    FROM visits v WHERE ${visitWhere}`;

  const detailSql = `
        SELECT
            v.id,
            v.visit_date,
            v.visit_time,
            v.patient_id,
            COALESCE(p.name, 'Unknown Patient') AS patient,
            v.procedure_name AS procedure_name,
            v.amount_paid,
            v.balance,
            v.complain,
            v.description
        FROM visits v
        LEFT JOIN patients p ON p.id = v.patient_id
        WHERE ${visitWhere}
        ORDER BY v.visit_date DESC, v.visit_time DESC, v.id DESC
        LIMIT 200
    `;

  const procedureSql = `
        SELECT
            v.procedure_name AS name,
            COUNT(*) AS value
        FROM visits v
        WHERE ${visitWhere}
            AND v.procedure_name IS NOT NULL
            AND v.procedure_name <> ''
        GROUP BY v.procedure_name
        ORDER BY value DESC
        LIMIT 8
    `;

  const trendSql =
    group === "day"
      ? `
            SELECT
                DATE_FORMAT(MIN(v.visit_date), '%b %d') AS name,
                COALESCE(SUM(v.amount_paid), 0) AS value
            FROM visits v
            WHERE ${visitWhere}
            GROUP BY DATE(v.visit_date)
            ORDER BY DATE(v.visit_date) ASC
        `
      : `
            SELECT
                DATE_FORMAT(MIN(v.visit_date), '%b %Y') AS name,
                COALESCE(SUM(v.amount_paid), 0) AS value
            FROM visits v
            WHERE ${visitWhere}
            GROUP BY YEAR(v.visit_date), MONTH(v.visit_date)
            ORDER BY YEAR(v.visit_date), MONTH(v.visit_date)
        `;

  const params = visitParams;

  try {
    const client = db.promise();
    const [[summaryResult],[procedureResult],[trendResult],[detailResult]] = await Promise.all([
      client.query(summarySql,params),client.query(procedureSql,params),
      client.query(trendSql,params),client.query(detailSql,params),
    ]);
    const summary = summaryResult[0];
    res.json({ filters:{startDate,endDate,group,procedure:procedure || "All Procedures"},
      summary: Object.fromEntries(Object.entries(summary).map(([key,value])=>[key,Number(value || 0)])),
      revenue:trendResult.map(row=>({...row,value:Number(row.value || 0)})),
      procedures:procedureResult.map(row=>({...row,value:Number(row.value || 0)})),
      details:detailResult.map(row=>({...row,amount_paid:Number(row.amount_paid || 0),balance:Number(row.balance || 0)})),
      detailLimit:200, detailsTruncated:Number(summary.totalVisits)>detailResult.length,
    });
  } catch (error) {
    console.error("Report generation failed:",error.code || error.name);
    res.status(500).json({message:"Unable to generate report."});
  }
};

// Export every matching visit through a stream instead of the 200-row screen preview.
exports.exportReports = (req,res) => {
  const range=getDateRange(req);
  if (!range) return res.status(400).json({message:"Enter a valid report date range."});
  const procedure=String(req.query.procedure || "");
  const {Transform,pipeline}=require("node:stream");
  const params=[range.startDate,range.endDate];
  if(procedure) params.push(procedure);
  const query=db.query(`SELECT v.visit_date,v.visit_time,p.name AS patient,v.procedure_name,
    v.amount_paid,v.balance,v.complain,v.description FROM visits v LEFT JOIN patients p ON p.id=v.patient_id
    WHERE v.visit_date BETWEEN ? AND ? ${procedure ? "AND v.procedure_name = ?" : ""}
    ORDER BY v.visit_date DESC,v.visit_time DESC,v.id DESC`,params);
  const stream=query.stream({highWaterMark:100});
  const keys=["visit_date","visit_time","patient","procedure_name","amount_paid","balance","complain","description"];
  const csvCell=(value)=>{
    let text=String(value ?? "");
    // Prevent spreadsheet formula injection from patient-entered text.
    if (/^[\s]*[=+@-]/.test(text)) text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  const transform=new Transform({writableObjectMode:true,transform(row,encoding,callback){
    callback(null,keys.map(key=>csvCell(row[key])).join(",")+"\r\n");
  }});
  res.type("text/csv");res.set("Content-Disposition",`attachment; filename="magno-dental-report-${range.startDate}-to-${range.endDate}.csv"`);
  res.write("Date,Time,Patient,Procedure,Amount Paid,Balance,Complaint,Description\r\n");
  pipeline(stream,transform,res,error=>{if(error) console.error("Report export interrupted:",error.code || error.name);});
};

/* |||| ADMIN - AVAILABLE PROCEDURES |||| */
exports.getReportProcedures = (req, res) => {
  const sql = `
        SELECT DISTINCT procedure_name AS name
        FROM visits
        WHERE procedure_name IS NOT NULL
          AND procedure_name <> ''
        ORDER BY procedure_name ASC
    `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Report procedures error:", err);
      return res.status(500).json({ message: "Unable to load procedures." });
    }

    res.json(result);
  });
};
