const db = require("../config/db");
const { uploadPrivateImage: uploadToCloudinary } = require("../services/privateImages");

/* =========================================================
   GET ALL PATIENTS
========================================================= */

exports.getPatients = async (req, res) => {
  // Keep the legacy array response for older consumers; new screens request pages.
  const paginated = req.query.page !== undefined;
  const page = Math.max(1, Number.parseInt(req.query.page,10) || 1);
  const size = Math.min(100, Math.max(1, Number.parseInt(req.query.page_size,10) || 10));
  const search = String(req.query.search || "").trim().slice(0,150);
  const conditions = [];
  const params = [];
  if (search) { conditions.push("(name LIKE ? OR CAST(id AS CHAR) LIKE ? OR occupation LIKE ?)"); params.push(...Array(3).fill(`%${search}%`)); }
  const ages = { "under-18": "age < 18", "18-30": "age BETWEEN 18 AND 30", "31-50": "age BETWEEN 31 AND 50", "51-65": "age BETWEEN 51 AND 65", "66-plus": "age >= 66" };
  if (Object.hasOwn(ages, req.query.age)) conditions.push(ages[req.query.age]);
  const sorts = { "name-az": "name ASC, id ASC", "name-za": "name DESC, id DESC", "registration-oldest": "created_at ASC, id ASC", "registration-newest": "created_at DESC, id DESC" };
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sort = Object.hasOwn(sorts, req.query.sort) ? sorts[req.query.sort] : "id DESC";
  try {
    if (!paginated) { const [rows] = await db.promise().query(`SELECT * FROM patients ${where} ORDER BY ${sort}`,params); return res.json(rows); }
    const [[count]] = await db.promise().query(`SELECT COUNT(*) AS total FROM patients ${where}`,params);
    const total = Number(count.total);
    const pages = Math.max(1,Math.ceil(total/size));
    const effectivePage = Math.min(page,pages);
    const columns = req.query.compact === "true" ? "id, name" : "*";
    const [items] = await db.promise().query(`SELECT ${columns} FROM patients ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`,[...params,size,(effectivePage-1)*size]);
    return res.json({items,total,page:effectivePage,totalPages:pages});
  } catch (error) { console.error("Patient list failed:",error.code); return res.status(500).json({message:"Unable to retrieve patients."}); }
};

/* =========================================================
   GET RECENT PATIENTS

   Returns the 5 most recently registered patients.
========================================================= */

exports.getRecentPatients = (req, res) => {
  const sql = `
    SELECT
      p.id,
      p.name,
      p.age,
      p.status,
      p.image,
      MAX(v.visit_date) AS last_visit

    FROM patients p

    LEFT JOIN visits v
      ON p.id = v.patient_id

    GROUP BY
      p.id,
      p.name,
      p.age,
      p.status,
      p.image

    ORDER BY p.id DESC

    LIMIT 5
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Recent patients error:", err);

      return res.status(500).json({
        message: "Unable to load recent patients.",
      });
    }

    res.json(result);
  });
};

/* =========================================================
   ADD PATIENT
========================================================= */

exports.addPatient = async (req, res) => {
  const { name, age, phone, occupation, status, complain, address } = req.body;

  /*
   * Validate required fields.
   */
  if (!name || !age || !phone || !occupation || !complain || !address) {
    return res.status(400).json({
      message: "Please complete all required fields.",
    });
  }

  const civilStatus = status || "Single";

  try {
    /*
     * Default image value.
     */
    let image = null;

    /*
     * If the user selected an image,
     * upload it to Cloudinary.
     */
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);

      image = `private:${uploadResult.public_id}`;

    }

    /*
     * Save patient information.
     *
     * The image column now stores the complete Cloudinary URL.
     */
    const sql = `
      INSERT INTO patients
      (
        name,
        address,
        phone,
        age,
        occupation,
        status,
        complain,
        image
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [name, address, phone, age, occupation, civilStatus, complain, image],
      (err, result) => {
        if (err) {
          console.error("Add patient database error:", err);

          return res.status(500).json({
            message: "Unable to add patient.",
          });
        }

        res.status(201).json({
          message: "Patient Added Successfully",
          patientId: result.insertId,
          image: image,
        });
      },
    );
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return res.status(500).json({
      message: "Unable to upload patient image.",
    });
  }
};

/* =========================================================
   UPDATE PATIENT
========================================================= */

exports.updatePatient = async (req, res) => {
  const { id } = req.params;

  const { name, age, occupation, address, phone, gender, status, complain } =
    req.body;

  /*
   * Patient name is required.
   */
  if (!name) {
    return res.status(400).json({
      message: "Patient name is required.",
    });
  }

  try {
    /*
     * No image by default.
     *
     * If no new image is uploaded,
     * the existing image remains unchanged.
     */
    let image = null;

    /*
     * Upload a new image only if one was selected.
     */
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);

      image = `private:${uploadResult.public_id}`;

    }

    /*
     * Patient fields to update.
     */
    const fields = [
      "name = ?",
      "age = ?",
      "occupation = ?",
      "address = ?",
      "phone = ?",
      "gender = ?",
      "status = ?",
      "complain = ?",
    ];

    const values = [
      name,
      age || null,
      occupation || null,
      address || null,
      phone || null,
      gender || null,
      status || null,
      complain || null,
    ];

    /*
     * Only update the image column
     * if the user uploaded a new image.
     */
    if (image) {
      fields.push("image = ?");
      values.push(image);
    }

    /*
     * Patient ID for WHERE clause.
     */
    values.push(id);

    const sql = `
      UPDATE patients
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Update patient error:", err);

        return res.status(500).json({
          message: "Unable to update patient.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Patient not found.",
        });
      }

      res.json({
        message: "Patient updated successfully.",
        image: image,
      });
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return res.status(500).json({
      message: "Unable to upload patient image.",
    });
  }
};

/* =========================================================
   PATIENT PORTAL
   GET MY PROFILE
========================================================= */

exports.getMyProfile = (req, res) => {
  const patientId = req.user.patient_id;

  if (!patientId) {
    return res.status(400).json({
      message: "Your account is not linked to a patient record.",
    });
  }

  const sql = `
    SELECT
      patients.id,
      patients.name,
      patients.address,
      patients.phone,
      patients.age,
      patients.occupation,
      patients.gender,
      patients.status,
      patients.complain,
      patients.image,
      patients.created_at,

      users.fullname,
      users.email,
      users.role

    FROM patients

    INNER JOIN users
      ON users.patient_id = patients.id

    WHERE patients.id = ?

    LIMIT 1
  `;

  db.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error("Get patient profile error:", err);

      return res.status(500).json({
        message: "Unable to load your profile.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Patient profile not found.",
      });
    }

    res.json(results[0]);
  });
};

/* =========================================================
   GET MY VISITS
========================================================= */

exports.getMyVisits = (req, res) => {
  const patientId = req.user.patient_id;

  const sql = `
    SELECT
      id,
      visit_date,
      visit_time,
      procedure_name,
      complain,
      description,
      amount_paid,
      balance,
      created_at

    FROM visits

    WHERE patient_id = ?

    ORDER BY
      visit_date DESC,
      visit_time DESC,
      id DESC
  `;

  db.query(sql, [patientId], (err, result) => {
    if (err) {
      console.error("Get patient visits error:", err);

      return res.status(500).json({
        message: "Unable to retrieve treatment history.",
      });
    }

    res.json(result);
  });
};

/* =========================================================
   GET MY BALANCE
========================================================= */

exports.getMyBalance = (req, res) => {
  const patientId = req.user.patient_id;

  const sql = `
    SELECT
      COALESCE(
        SUM(balance),
        0
      ) AS total_balance

    FROM visits

    WHERE patient_id = ?
  `;

  db.query(sql, [patientId], (err, result) => {
    if (err) {
      console.error("Get patient balance error:", err);

      return res.status(500).json({
        message: "Unable to retrieve balance.",
      });
    }

    res.json({
      total_balance: Number(result[0].total_balance || 0),
    });
  });
};

/* =========================================================
   UPDATE MY PROFILE
========================================================= */

exports.updateMyProfile = (req, res) => {
  const patientId = req.user.patient_id;

  const { address, phone, occupation, gender } = req.body;

  const sql = `
    UPDATE patients

    SET
      address = ?,
      phone = ?,
      occupation = ?,
      gender = ?

    WHERE id = ?
  `;

  db.query(
    sql,
    [address, phone, occupation, gender, patientId],
    (err, result) => {
      if (err) {
        console.error("Update patient profile error:", err);

        return res.status(500).json({
          message: "Unable to update profile.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Patient record not found.",
        });
      }

      res.json({
        message: "Profile updated successfully.",
      });
    },
  );
};
