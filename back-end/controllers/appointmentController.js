const db = require("../config/db");

const createNotification = (patientId, title, message, type) => {
  return new Promise((resolve, reject) => {
    const sql = `
            INSERT INTO notifications
            (
                patient_id,
                title,
                message,
                type
            )
            VALUES (?, ?, ?, ?)
        `;

    db.query(sql, [patientId, title, message, type], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
};

const { createAdminNotification } = require("../services/notificationService");

const {
  sendAppointmentSubmittedEmail,
  sendAppointmentApprovedEmail,
  sendAppointmentCancelledEmail,
  sendAppointmentRescheduledEmail,
} = require("../services/emailService");

/* ||||| CREATE PUBLIC APPOINTMENT ||||| */

exports.createAppointment = async (req, res) => {
  const {
    fullname,
    email,
    phone,
    preferred_date,
    preferred_time,
    service,
    reason,
  } = req.body;

  /* ============VALIDATION ============*/

  if (
    !fullname ||
    !email ||
    !phone ||
    !preferred_date ||
    !preferred_time ||
    !service
  ) {
    return res.status(400).json({
      message: "Please complete all required fields.",
    });
  }

  /* ============CHECK IF EMAIL BELONGS TO EXISTING PATIENT ============*/

  const findPatientSql = `
        SELECT
            u.patient_id

        FROM users u

        WHERE
            LOWER(u.email) = LOWER(?)
            AND u.role = 'patient'
            AND u.patient_id IS NOT NULL

        LIMIT 1
    `;

  db.query(
    findPatientSql,
    [email],

    async (patientErr, patientResult) => {
      if (patientErr) {
        console.error("Find patient error:", patientErr);

        return res.status(500).json({
          message: "Unable to process appointment.",
        });
      }

      /* ========GET PATIENT ID ========*/

      let patientId = null;

      if (patientResult.length > 0) {
        patientId = patientResult[0].patient_id;
      }

      /* ========INSERT APPOINTMENT ========*/

      const sql = `
                INSERT INTO appointments
                (
                    patient_id,
                    fullname,
                    email,
                    phone,
                    preferred_date,
                    preferred_time,
                    service,
                    reason,
                    status
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
            `;

      db.query(
        sql,

        [
          patientId,
          fullname,
          email,
          phone,
          preferred_date,
          preferred_time,
          service,
          reason,
        ],

        async (err, result) => {
          if (err) {
            console.error("Create appointment error:", err);

            return res.status(500).json({
              message: "Unable to create appointment.",
            });
          }

          createAdminNotification({
            title: "New Appointment Request",
            message: `${fullname} submitted an appointment request for ${preferred_date} at ${preferred_time}.`,
            type: "new_appointment",
          }).catch((notificationError) => {
            console.error(
              "Admin notification creation failed:",
              notificationError.message,
            );
          });

          /* Get the appointment that was just created. */
          db.query(
            `
                            SELECT *
                            FROM appointments
                            WHERE id = ?
                        `,

            [result.insertId],

            async (selectErr, appointmentResult) => {
              if (selectErr) {
                console.error(selectErr);

                return res.status(201).json({
                  message: "Appointment submitted successfully.",

                  appointmentId: result.insertId,
                });
              }

              const appointment = appointmentResult[0];

              /* ===================================== SEND EMAIL ===================================== */

              try {
                await sendAppointmentSubmittedEmail(appointment);

                console.log("✅ Appointment email sent.");
              } catch (emailError) {
                console.error(
                  "❌ Appointment email failed:",
                  emailError.message,
                );
              }

              /* ===================================== RESPONSE ===================================== */

              res.status(201).json({
                message: "Appointment submitted successfully.",

                appointmentId: result.insertId,

                patientLinked: patientId !== null,
              });
            },
          );
        },
      );
    },
  );
};

/* ||||| GET ALL APPOINTMENTS ||||| ADMIN ONLY ||||| */

exports.getAppointments = (req, res) => {
  const sql = `
        SELECT *
        FROM appointments
        ORDER BY
            CASE
                WHEN status = 'Pending' THEN 1
                WHEN status = 'Approved' THEN 2
                WHEN status = 'Completed' THEN 3
                WHEN status = 'Cancelled' THEN 4
                ELSE 5
            END,
            preferred_date ASC,
            preferred_time ASC
    `;

  db.query(
    sql,

    (err, result) => {
      if (err) {
        console.error("Get appointments error:", err);

        return res.status(500).json({
          message: "Unable to retrieve appointments.",
        });
      }

      res.json(result);
    },
  );
};

/* Create a patient record when a public appointment is approved. */
const createPatientFromAppointment = (appointment) => {
  return new Promise((resolve, reject) => {
    if (appointment.patient_id) {
      resolve(appointment.patient_id);
      return;
    }

    db.query(
      `SELECT id FROM patients WHERE phone = ? LIMIT 1`,
      [appointment.phone],
      (findErr, existing) => {
        if (findErr) {
          reject(findErr);
          return;
        }

        if (existing.length > 0) {
          resolve(existing[0].id);
          return;
        }

        db.query(
          `INSERT INTO patients
            (name, address, phone, age, occupation, gender, status, complain, image)
           VALUES (?, ?, ?, ?, ?, NULL, 'Active', ?, NULL)`,
          [
            appointment.fullname,
            "",
            appointment.phone,
            0,
            "",
            appointment.reason || appointment.service || "Appointment booking",
          ],
          (insertErr, result) => {
            if (insertErr) {
              reject(insertErr);
              return;
            }

            resolve(result.insertId);
          },
        );
      },
    );
  });
};

/* ||||| UPDATE APPOINTMENT STATUS ||||| ADMIN ONLY ||||| */
exports.updateAppointmentStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    "Pending",
    "Approved",
    "Rescheduled",
    "Completed",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid appointment status.",
    });
  }

  db.query(
    `SELECT * FROM appointments WHERE id = ?`,
    [id],
    async (findErr, results) => {
      if (findErr) {
        console.error("Find appointment error:", findErr);
        return res.status(500).json({
          message: "Unable to find appointment.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Appointment not found.",
        });
      }

      const appointment = results[0];

      try {
        /* Public bookings become patient records when approved. */
        if (status === "Approved" && !appointment.patient_id) {
          const patientId = await createPatientFromAppointment(appointment);

          await new Promise((resolve, reject) => {
            db.query(
              `UPDATE appointments SET patient_id = ? WHERE id = ?`,
              [patientId, id],
              (updateErr) => {
                if (updateErr) {
                  reject(updateErr);
                  return;
                }
                resolve();
              },
            );
          });

          appointment.patient_id = patientId;
        }

        await new Promise((resolve, reject) => {
          db.query(
            `UPDATE appointments SET status = ? WHERE id = ?`,
            [status, id],
            (updateErr) => {
              if (updateErr) {
                reject(updateErr);
                return;
              }
              resolve();
            },
          );
        });

        appointment.status = status;

        try {
          if (status === "Approved") {
            await sendAppointmentApprovedEmail(appointment);

            if (appointment.patient_id) {
              await createNotification(
                appointment.patient_id,
                "Appointment Approved",
                "Your appointment has been approved.",
                "approved",
              );
            }
          } else if (status === "Cancelled") {
            await sendAppointmentCancelledEmail(appointment);

            if (appointment.patient_id) {
              await createNotification(
                appointment.patient_id,
                "Appointment Cancelled",
                "Your appointment has been cancelled. Please contact the clinic if you need assistance.",
                "cancelled",
              );
            }
          } else if (status === "Completed" && appointment.patient_id) {
            await createNotification(
              appointment.patient_id,
              "Appointment Completed",
              "Your appointment has been marked as completed.",
              "completed",
            );
          }
        } catch (notificationError) {
          console.error(
            "Appointment notification error:",
            notificationError.message,
          );
        }

        return res.json({
          message: `Appointment marked as ${status}.`,
          patientCreated:
            status === "Approved" && Boolean(appointment.patient_id),
          patientId: appointment.patient_id || null,
        });
      } catch (error) {
        console.error("Approve appointment error:", error);

        return res.status(500).json({
          message:
            status === "Approved"
              ? "Unable to approve appointment and create the patient record."
              : "Unable to update appointment.",
        });
      }
    },
  );
};

/* ||||| RESCHEDULE APPOINTMENT ||||| ADMIN ONLY ||||| */
exports.rescheduleAppointment = (req, res) => {
  const { id } = req.params;

  const { preferred_date, preferred_time } = req.body;

  if (!preferred_date || !preferred_time) {
    return res.status(400).json({
      message: "Date and time are required.",
    });
  }

  /* FIND APPOINTMENT */

  db.query(
    `
        SELECT *
        FROM appointments
        WHERE id = ?
        `,

    [id],

    async (findErr, results) => {
      if (findErr) {
        console.error(findErr);

        return res.status(500).json({
          message: "Unable to find appointment.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Appointment not found.",
        });
      }

      const appointment = results[0];

      /* UPDATE DATE AND TIME */

      db.query(
        `
                UPDATE appointments

                SET
                    preferred_date = ?,
                    preferred_time = ?,
                    status = 'Rescheduled'


                WHERE id = ?
                `,

        [preferred_date, preferred_time, id],

        async (updateErr, result) => {
          if (updateErr) {
            console.error(updateErr);

            return res.status(500).json({
              message: "Unable to reschedule appointment.",
            });
          }

          /* ===================================== UPDATE OBJECT ===================================== */

          appointment.preferred_date = preferred_date;

          appointment.preferred_time = preferred_time;

          appointment.status = "Rescheduled";

          /* ||||| CREATE RESCHEDULE NOTIFICATION ||||| */

          try {
            await createNotification(
              appointment.patient_id,
              "Appointment Rescheduled",
              `Your appointment has been rescheduled to ${preferred_date} at ${preferred_time}.`,
              "rescheduled",
            );

            console.log("✅ Reschedule notification created.");
          } catch (notificationError) {
            console.error(
              "❌ Reschedule notification failed:",
              notificationError.message,
            );
          }

          /* ===================================== SEND EMAIL ===================================== */

          try {
            await sendAppointmentRescheduledEmail(appointment);

            console.log("✅ Reschedule email sent.");
          } catch (emailError) {
            console.error("❌ Reschedule email failed:", emailError.message);
          }

          res.json({
            message: "Appointment rescheduled successfully.",
          });
        },
      );
    },
  );
};

/* ||||| PATIENT - VIEW OWN APPOINTMENTS ||||| */

exports.getMyAppointments = (req, res) => {
  const patientId = req.user.patient_id;

  if (!patientId) {
    return res.status(400).json({
      message: "Patient account is not linked to a patient record.",
    });
  }

  const sql = `
    SELECT
        a.id,
        a.fullname,
        a.email,
        a.phone,
        a.preferred_date,
        a.preferred_time,
        a.service,
        a.reason,
        a.status,
        a.created_at,

        q.id AS queue_id,
        q.queue_number,
        q.queue_type,
        q.priority,
        q.status AS queue_status,
        q.check_in_time,
        q.called_at,
        q.treatment_started_at,
        q.completed_at

    FROM appointments a

    LEFT JOIN queue q
        ON q.appointment_id = a.id

    WHERE a.patient_id = ?

    ORDER BY
        a.preferred_date ASC,
        a.preferred_time ASC,
        a.id DESC
`;

  db.query(sql, [patientId], (err, result) => {
    if (err) {
      console.error("Get my appointments error:", err);

      return res.status(500).json({
        message: "Unable to retrieve appointments.",
      });
    }

    res.json(result);
  });
};

/* ||||| PATIENT - CREATE APPOINTMENT ||||| */
exports.createPatientAppointment = (req, res) => {
  const patientId = req.user.patient_id;

  const { preferred_date, preferred_time, service, reason } = req.body;

  /* =*/
  /* CHECK PATIENT ID */
  /* =*/

  if (!patientId) {
    return res.status(400).json({
      message: "Your account is not linked to a patient record.",
    });
  }

  /* =*/
  /* VALIDATION */
  /* =*/

  if (!preferred_date || !preferred_time || !service) {
    return res.status(400).json({
      message: "Please complete all required fields.",
    });
  }

  /* =*/
  /* GET PATIENT + USER INFORMATION */
  /* =*/

  const patientSql = `
        SELECT
            patients.id,
            patients.name,
            patients.phone,
            users.fullname,
            users.email

        FROM patients

        INNER JOIN users
            ON users.patient_id = patients.id

        WHERE patients.id = ?

        LIMIT 1
    `;

  db.query(
    patientSql,
    [patientId],

    (patientErr, patientResult) => {
      if (patientErr) {
        console.error("Patient lookup error:", patientErr);

        return res.status(500).json({
          message: "Unable to retrieve patient information.",
        });
      }

      if (patientResult.length === 0) {
        return res.status(404).json({
          message: "Patient record not found.",
        });
      }

      const patientData = patientResult[0];

      /* =*/
      /* CREATE APPOINTMENT */
      /* =*/

      const sql = `
                INSERT INTO appointments
                (
                    patient_id,
                    fullname,
                    email,
                    phone,
                    preferred_date,
                    preferred_time,
                    service,
                    reason,
                    status
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
            `;

      db.query(
        sql,

        [
          patientData.id,
          patientData.fullname,
          patientData.email,
          patientData.phone,
          preferred_date,
          preferred_time,
          service,
          reason || null,
        ],

        (err, result) => {
          if (err) {
            console.error("Create patient appointment error:", err);

            return res.status(500).json({
              message: "Unable to book appointment.",
            });
          }

          createAdminNotification({
            title: "New Appointment Request",
            message: `${patientData.fullname} submitted an appointment request for ${preferred_date} at ${preferred_time}.`,
            type: "new_appointment",
          }).catch((notificationError) => {
            console.error(
              "Admin notification creation failed:",
              notificationError.message,
            );
          });

          return res.status(201).json({
            message:
              "Appointment submitted successfully. Please wait for confirmation.",

            appointmentId: result.insertId,
          });
        },
      );
    },
  );
};
