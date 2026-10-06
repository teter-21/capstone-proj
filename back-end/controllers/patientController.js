const db = require("../config/db");
const cloudinary = require("../config/cloudinary");

/*
 * Upload an image buffer to Cloudinary.
 *
 * Multer now uses memoryStorage(), so uploaded files are available through:
 *
 * req.file.buffer
 *
 * This function sends that buffer to Cloudinary and returns the
 * Cloudinary upload result.
 */
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "magno-dental/patients",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
};

/* =========================================================
   GET ALL PATIENTS
========================================================= */

exports.getPatients = (req, res) => {
  const sql = `
    SELECT *
    FROM patients
    ORDER BY id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Get patients error:", err);

      return res.status(500).json({
        message: "Failed to retrieve patients.",
      });
    }

    res.status(200).json(result);
  });
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

      image = uploadResult.secure_url;

      console.log("Patient image uploaded to Cloudinary:", image);
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

      image = uploadResult.secure_url;

      console.log("Updated patient image:", image);
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
