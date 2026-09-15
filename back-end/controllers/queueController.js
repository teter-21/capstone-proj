const db = require("../config/db");

const notificationService = require("../services/notificationService");

/* |||||| GET TODAY'S QUEUE |||||| */

exports.getTodayQueue = (req, res) => {
  const sql = `
        SELECT
            q.id,
            q.queue_number,
            q.patient_id,
            q.appointment_id,
            q.patient_name,
            q.queue_type,
            q.service,
            q.reason,
            q.priority,
            q.status,
            q.queue_date,
            q.check_in_time,
            q.called_at,
            q.treatment_started_at,
            q.completed_at,
            q.created_at

        FROM queue q

        WHERE q.queue_date = CURDATE()

        ORDER BY
            CASE
                WHEN q.status = 'In Treatment' THEN 1
                WHEN q.status = 'Called' THEN 2
                WHEN q.status = 'Waiting' THEN 3
                WHEN q.status = 'Completed' THEN 4
                WHEN q.status = 'Skipped' THEN 5
                WHEN q.status = 'Cancelled' THEN 6
                ELSE 7
            END,

            CASE
                WHEN q.priority = 'Urgent' THEN 1
                ELSE 2
            END,

            q.queue_number ASC
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Get queue error:", err);

      return res.status(500).json({
        message: "Unable to load today's queue.",
      });
    }

    res.json(results);
  });
};

/* |||||| CALL NEXT PATIENT |||||| */

exports.callNextPatient = (req, res) => {
  /*  CHECK IF SOMEONE IS ALREADY CALLED / IN TREATMENT  */

  const activeSql = `
        SELECT
            id,
            queue_number,
            patient_name,
            status

        FROM queue

        WHERE queue_date = CURDATE()

        AND status IN (
            'Called',
            'In Treatment'
        )

        LIMIT 1
    `;

  db.query(activeSql, (activeError, activeResults) => {
    if (activeError) {
      console.error("Active queue check error:", activeError);

      return res.status(500).json({
        message: "Unable to check the current queue.",
      });
    }

    if (activeResults.length > 0) {
      return res.status(400).json({
        message: `Patient #${activeResults[0].queue_number} is currently ${activeResults[0].status}.`,
      });
    }

    /*  FIND NEXT PATIENT  */

    const nextSql = `
                SELECT
                    id,
                    queue_number,
                    patient_name,
                    queue_type,
                    service,
                    priority,
                    status

                FROM queue

                WHERE queue_date = CURDATE()

                AND status = 'Waiting'

                ORDER BY

                    CASE
                        WHEN priority = 'Urgent'
                        THEN 1
                        ELSE 2
                    END,

                    queue_number ASC

                LIMIT 1
            `;

    db.query(nextSql, (nextError, nextResults) => {
      if (nextError) {
        console.error("Find next patient error:", nextError);

        return res.status(500).json({
          message: "Unable to find the next patient.",
        });
      }

      if (nextResults.length === 0) {
        return res.status(404).json({
          message: "There are no waiting patients.",
        });
      }

      const patient = nextResults[0];

      /*  CALL PATIENT  */

      const updateSql = `
                        UPDATE queue

                        SET
                            status = 'Called',
                            called_at = NOW()

                        WHERE id = ?

                        AND status = 'Waiting'
                    `;

      db.query(updateSql, [patient.id], (updateError, updateResult) => {
        if (updateError) {
          console.error("Call next update error:", updateError);

          return res.status(500).json({
            message: "Unable to call the next patient.",
          });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(400).json({
            message: "The patient is no longer waiting.",
          });
        }

        res.json({
          message: "Next patient called successfully.",

          patient: {
            id: patient.id,

            queue_number: patient.queue_number,

            patient_name: patient.patient_name,

            queue_type: patient.queue_type,

            service: patient.service,

            priority: patient.priority,

            status: "Called",
          },
        });
      });
    });
  });
};

/* |||||| GET NEXT QUEUE NUMBER |||||| */

const getNextQueueNumber = (callback) => {
  const sql = `
        SELECT
            COALESCE(
                MAX(queue_number),
                0
            ) + 1 AS next_number

        FROM queue

        WHERE queue_date = CURDATE()
    `;

  db.query(sql, (err, result) => {
    if (err) {
      return callback(err, null);
    }

    callback(null, result[0].next_number);
  });
};

/* |||||| CHECK IN APPOINTMENT |||||| */

exports.checkInAppointment = (req, res) => {
  const appointmentId = req.params.id;

  /*  GET APPOINTMENT  */

  const appointmentSql = `
        SELECT
            id,
            patient_id,
            fullname,
            preferred_date,
            preferred_time,
            service,
            reason,
            status

        FROM appointments

        WHERE id = ?

        LIMIT 1
    `;

  db.query(appointmentSql, [appointmentId], (err, results) => {
    if (err) {
      console.error("Check-in appointment lookup error:", err);

      return res.status(500).json({
        message: "Unable to retrieve appointment.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Appointment not found.",
      });
    }

    const appointment = results[0];

    /*  CHECK APPOINTMENT STATUS  */

    if (
      appointment.status !== "Approved" &&
      appointment.status !== "Rescheduled"
    ) {
      return res.status(400).json({
        message: "Only approved or rescheduled appointments can be checked in.",
      });
    }

    /*  PREVENT DUPLICATE QUEUE ENTRY  */

    const existingSql = `
                SELECT
                    id,
                    queue_number,
                    status

                FROM queue

                WHERE appointment_id = ?

                AND queue_date = CURDATE()

                LIMIT 1
            `;

    db.query(existingSql, [appointmentId], (existingErr, existingResult) => {
      if (existingErr) {
        console.error("Queue duplicate check error:", existingErr);

        return res.status(500).json({
          message: "Unable to check queue.",
        });
      }

      if (existingResult.length > 0) {
        return res.status(400).json({
          message: "This appointment is already in today's queue.",
          queue: existingResult[0],
        });
      }

      /*  GET QUEUE NUMBER  */

      getNextQueueNumber((numberError, queueNumber) => {
        if (numberError) {
          console.error("Queue number error:", numberError);

          return res.status(500).json({
            message: "Unable to generate queue number.",
          });
        }

        /*  INSERT QUEUE ENTRY  */

        const insertSql = `
                                INSERT INTO queue
                                (
                                    queue_number,
                                    patient_id,
                                    appointment_id,
                                    patient_name,
                                    queue_type,
                                    service,
                                    reason,
                                    priority,
                                    status,
                                    queue_date,
                                    check_in_time
                                )

                                VALUES
                                (
                                    ?,
                                    ?,
                                    ?,
                                    ?,
                                    'Appointment',
                                    ?,
                                    ?,
                                    'Normal',
                                    'Waiting',
                                    CURDATE(),
                                    NOW()
                                )
                            `;

        db.query(
          insertSql,
          [
            queueNumber,
            appointment.patient_id,
            appointment.id,
            appointment.fullname,
            appointment.service,
            appointment.reason,
          ],
          (insertErr, insertResult) => {
            if (insertErr) {
              console.error("Check-in insert error:", insertErr);

              return res.status(500).json({
                message: "Unable to add appointment to queue.",
              });
            }

            /*  SEND IN-APP NOTIFICATION  */

            notificationService
              .createNotification({
                patient_id: appointment.patient_id,
                title: "You're in the Queue",
                message: `You have been checked in successfully. Your queue number is #${queueNumber}.`,
                type: "queue",
              })
              .catch((error) => {
                console.error("Queue notification error:", error);
              });

            res.json({
              message: "Patient checked in successfully.",

              queue: {
                id: insertResult.insertId,

                queue_number: queueNumber,

                patient_name: appointment.fullname,

                queue_type: "Appointment",

                status: "Waiting",
              },
            });
          },
        );
      });
    });
  });
};

/* |||||| ADD WALK-IN |||||| */

exports.addWalkIn = (req, res) => {
  const { patient_id, patient_name, service, reason, priority } = req.body;

  /*  VALIDATION  */

  if (!patient_name) {
    return res.status(400).json({
      message: "Patient name is required.",
    });
  }

  /*  GET QUEUE NUMBER  */

  getNextQueueNumber((numberError, queueNumber) => {
    if (numberError) {
      console.error("Walk-in queue number error:", numberError);

      return res.status(500).json({
        message: "Unable to generate queue number.",
      });
    }

    const sql = `
                INSERT INTO queue
                (
                    queue_number,
                    patient_id,
                    appointment_id,
                    patient_name,
                    queue_type,
                    service,
                    reason,
                    priority,
                    status,
                    queue_date,
                    check_in_time
                )

                VALUES
                (
                    ?,
                    ?,
                    NULL,
                    ?,
                    'Walk-in',
                    ?,
                    ?,
                    ?,
                    'Waiting',
                    CURDATE(),
                    NOW()
                )
            `;

    db.query(
      sql,
      [
        queueNumber,
        patient_id || null,
        patient_name,
        service || null,
        reason || null,
        priority || "Normal",
      ],
      (err, result) => {
        if (err) {
          console.error("Add walk-in error:", err);

          return res.status(500).json({
            message: "Unable to add walk-in patient.",
          });
        }

        res.json({
          message: "Walk-in patient added to queue.",

          queue: {
            id: result.insertId,

            queue_number: queueNumber,

            patient_name: patient_name,

            queue_type: "Walk-in",

            status: "Waiting",
          },
        });
      },
    );
  });
};

/* |||||| CALL PATIENT |||||| */

exports.callPatient = (req, res) => {
  const id = req.params.id;

  /*  GET PATIENT INFORMATION  */

  const getPatientSql = `
        SELECT
            patient_id,
            queue_number,
            patient_name

        FROM queue

        WHERE id = ?

        LIMIT 1
    `;

  db.query(getPatientSql, [id], (lookupErr, results) => {
    if (lookupErr) {
      console.error("Call patient lookup error:", lookupErr);

      return res.status(500).json({
        message: "Unable to retrieve queue patient.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Queue patient not found.",
      });
    }

    const patient = results[0];

    /*  UPDATE QUEUE STATUS  */

    const sql = `
                UPDATE queue

                SET
                    status = 'Called',
                    called_at = NOW()

                WHERE id = ?

                AND status = 'Waiting'
            `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("Call patient error:", err);

        return res.status(500).json({
          message: "Unable to call patient.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Patient cannot be called in the current status.",
        });
      }

      /*  SEND NOTIFICATION  */

      if (patient.patient_id) {
        notificationService
          .createNotification({
            patient_id: patient.patient_id,

            title: "It's Your Turn",

            message: `Queue #${patient.queue_number}: It's your turn. Please proceed to the treatment area.`,

            type: "queue_called",
          })
          .catch((error) => {
            console.error("Call notification error:", error);
          });
      }

      res.json({
        message: "Patient called successfully.",
      });
    });
  });
};

/* |||||| START TREATMENT |||||| */

exports.startTreatment = (req, res) => {
  const id = req.params.id;

  /*  GET PATIENT INFORMATION  */

  const getPatientSql = `
        SELECT
            patient_id,
            queue_number,
            patient_name

        FROM queue

        WHERE id = ?

        LIMIT 1
    `;

  db.query(getPatientSql, [id], (lookupErr, results) => {
    if (lookupErr) {
      console.error("Start treatment lookup error:", lookupErr);

      return res.status(500).json({
        message: "Unable to retrieve queue patient.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Queue patient not found.",
      });
    }

    const patient = results[0];

    /*  UPDATE QUEUE STATUS  */

    const sql = `
                UPDATE queue

                SET
                    status = 'In Treatment',
                    treatment_started_at = NOW()

                WHERE id = ?

                AND status = 'Called'
            `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("Start treatment error:", err);

        return res.status(500).json({
          message: "Unable to start treatment.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Patient must be called before treatment can start.",
        });
      }

      /*  SEND NOTIFICATION  */

      if (patient.patient_id) {
        notificationService
          .createNotification({
            patient_id: patient.patient_id,

            title: "Treatment Started",

            message: `Your dental treatment has started. Queue #${patient.queue_number} is now in treatment.`,

            type: "treatment_started",
          })
          .catch((error) => {
            console.error("Treatment notification error:", error);
          });
      }

      res.json({
        message: "Treatment started.",
      });
    });
  });
};

/* |||||| COMPLETE QUEUE |||||| */

exports.completeQueue = (req, res) => {
  const id = req.params.id;

  /*  GET PATIENT INFORMATION  */

  const getPatientSql = `
        SELECT
            patient_id,
            appointment_id,
            queue_number,
            patient_name

        FROM queue

        WHERE id = ?

        LIMIT 1
    `;

  db.query(getPatientSql, [id], (lookupErr, results) => {
    if (lookupErr) {
      console.error("Complete queue lookup error:", lookupErr);

      return res.status(500).json({
        message: "Unable to retrieve queue patient.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Queue patient not found.",
      });
    }

    const patient = results[0];

    /*  UPDATE QUEUE STATUS  */

    const sql = `
                UPDATE queue

                SET
                    status = 'Completed',
                    completed_at = NOW()

                WHERE id = ?

                AND status = 'In Treatment'
            `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("Complete queue error:", err);

        return res.status(500).json({
          message: "Unable to complete queue.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Patient must be in treatment before completing.",
        });
      }

      /*  UPDATE APPOINTMENT STATUS  */

      const updateAppointment = () => {
        if (!patient.appointment_id) {
          return;
        }

        const appointmentSql = `
                            UPDATE appointments

                            SET
                                status = 'Completed'

                            WHERE id = ?
                        `;

        db.query(appointmentSql, [patient.appointment_id], (appointmentErr) => {
          if (appointmentErr) {
            console.error(
              "Update appointment completion error:",
              appointmentErr,
            );
          }
        });
      };

      updateAppointment();

      /*  SEND NOTIFICATION  */

      if (patient.patient_id) {
        notificationService
          .createNotification({
            patient_id: patient.patient_id,

            title: "Treatment Completed",

            message: `Your dental treatment has been completed. Thank you for visiting Magno Dental Clinic.`,

            type: "treatment_completed",
          })
          .catch((error) => {
            console.error("Completion notification error:", error);
          });
      }

      res.json({
        message: "Patient treatment completed.",
      });
    });
  });
};

/* |||||| COMPLETE TREATMENT + CREATE VISIT RECORD |||||| */

exports.completeTreatmentWithVisit = (req, res) => {
  const id = req.params.id;

  const {
    visit_date,
    visit_time,
    procedure_name,
    complain,
    description,
    amount_paid,
    balance,
  } = req.body;

  if (!visit_date || !visit_time || !procedure_name) {
    return res.status(400).json({
      message: "Date, time, and procedure are required.",
    });
  }

  const getPatientSql = `
        SELECT
            id,
            patient_id,
            appointment_id,
            queue_number,
            patient_name,
            service,
            reason,
            status
        FROM queue
        WHERE id = ?
        LIMIT 1
    `;

  db.query(getPatientSql, [id], (lookupErr, results) => {
    if (lookupErr) {
      console.error("Complete treatment lookup error:", lookupErr);

      return res.status(500).json({
        message: "Unable to retrieve the treatment patient.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Queue patient not found.",
      });
    }

    const patient = results[0];

    if (patient.status !== "In Treatment") {
      return res.status(400).json({
        message:
          "Patient must be in treatment before the visit can be completed.",
      });
    }

    if (!patient.patient_id) {
      return res.status(400).json({
        message: "This queue entry is not linked to a patient record.",
      });
    }

    const paid = Number(amount_paid || 0);
    const remaining = Number(balance || 0);

    if (
      !Number.isFinite(paid) ||
      paid < 0 ||
      !Number.isFinite(remaining) ||
      remaining < 0
    ) {
      return res.status(400).json({
        message: "Amount paid and balance must be valid non-negative numbers.",
      });
    }

    const insertVisitSql = `
                INSERT INTO visits
                (
                    patient_id,
                    visit_date,
                    visit_time,
                    procedure_name,
                    complain,
                    description,
                    amount_paid,
                    balance
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

    db.query(
      insertVisitSql,
      [
        patient.patient_id,
        visit_date,
        visit_time,
        procedure_name,
        complain || patient.reason || null,
        description || null,
        paid,
        remaining,
      ],
      (visitErr, visitResult) => {
        if (visitErr) {
          console.error("Create visit from queue error:", visitErr);

          return res.status(500).json({
            message: "Unable to save the visit record.",
          });
        }

        const updateQueueSql = `
                        UPDATE queue
                        SET
                            status = 'Completed',
                            completed_at = NOW()
                        WHERE id = ?
                        AND status = 'In Treatment'
                    `;

        db.query(updateQueueSql, [id], (queueErr, queueResult) => {
          if (queueErr) {
            console.error("Complete treatment queue update error:", queueErr);

            return res.status(500).json({
              message:
                "Visit was saved, but the queue could not be completed. Please verify the queue entry before retrying.",
            });
          }

          if (queueResult.affectedRows === 0) {
            return res.status(400).json({
              message: "The patient is no longer in treatment.",
            });
          }

          const finishAppointment = () => {
            if (!patient.appointment_id) {
              return;
            }

            const appointmentSql = `
                                    UPDATE appointments
                                    SET status = 'Completed'
                                    WHERE id = ?
                                `;

            db.query(
              appointmentSql,
              [patient.appointment_id],
              (appointmentErr) => {
                if (appointmentErr) {
                  console.error(
                    "Update appointment completion error:",
                    appointmentErr,
                  );
                }
              },
            );
          };

          finishAppointment();

          notificationService
            .createNotification({
              patient_id: patient.patient_id,

              title: "Treatment Completed",

              message: `Your treatment has been completed. Visit record #${visitResult.insertId} has been saved.`,

              type: "treatment_completed",
            })
            .catch((error) => {
              console.error("Treatment completion notification error:", error);
            });

          return res.json({
            message: "Treatment completed and visit record saved successfully.",

            visit: {
              id: visitResult.insertId,

              patient_id: patient.patient_id,

              patient_name: patient.patient_name,

              procedure_name: procedure_name,

              amount_paid: paid,

              balance: remaining,
            },

            queue: {
              id: patient.id,

              queue_number: patient.queue_number,

              status: "Completed",
            },
          });
        });
      },
    );
  });
};

/* |||||| SKIP PATIENT |||||| */

exports.skipPatient = (req, res) => {
  const id = req.params.id;

  const sql = `
        UPDATE queue

        SET
            status = 'Skipped'

        WHERE id = ?

        AND status IN (
            'Waiting',
            'Called'
        )
    `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Skip patient error:", err);

      return res.status(500).json({
        message: "Unable to skip patient.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Patient cannot be skipped in the current status.",
      });
    }

    res.json({
      message: "Patient skipped.",
    });
  });
};

/* |||||| CANCEL QUEUE |||||| */

exports.cancelQueue = (req, res) => {
  const id = req.params.id;

  const sql = `
        UPDATE queue

        SET
            status = 'Cancelled'

        WHERE id = ?

        AND status IN (
            'Waiting',
            'Called'
        )
    `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Cancel queue error:", err);

      return res.status(500).json({
        message: "Unable to cancel queue entry.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Patient cannot be cancelled in the current status.",
      });
    }

    res.json({
      message: "Queue entry cancelled.",
    });
  });
};
