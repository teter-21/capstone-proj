import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../api";
import modalHeaderIcon from '../../assets/images/60x60modal-logo.png';
import '../../css/AddPatient.css';

import {
    FaUser,
    FaMapMarkerAlt,
    FaInfoCircle
} from "react-icons/fa";

import { buildFullName } from "../../utils/nameFormatter";


function AddPatient() {

    const navigate = useNavigate();

    /* FORM DATA */

    const [formData, setFormData] = useState({

        lastName: "",
        firstName: "",
        middleName: "",

        age: "",
        contactNo: "",

        occupation: "",
        gender: "",

        address: "",
        city: "",

        complaint: "",

        /* New patients are Active by default */
        status: "Active"

    });


    const [image, setImage] =
        useState(null);


    /* HANDLE INPUT CHANGE */

    const handleChange = (e) => {

        setFormData({

            ...formData,

            [e.target.name]:
                e.target.value

        });

    };


    /* HANDLE IMAGE */

    const handleImageChange = (e) => {

        const selectedImage =
            e.target.files[0];

        if (selectedImage) {

            setImage(selectedImage);

        }

    };


    /* HANDLE SUBMIT */

    const handleSubmit = async () => {

        console.log(
            "SAVE CLICKED"
        );


        /* BUILD FULL NAME */

        const fullname =
            buildFullName(

                formData.lastName,
                formData.firstName,
                formData.middleName

            );


        /* CREATE FORM DATA */

        const data =
            new FormData();


        data.append(
            "name",
            fullname
        );


        data.append(
            "age",
            formData.age
        );


        data.append(
            "phone",
            formData.contactNo
        );


        data.append(
            "occupation",
            formData.occupation
        );


        data.append(
            "gender",
            formData.gender
        );


        /* STATUS Only sends: Active or Inactive */

        data.append(
            "status",
            formData.status
        );


        data.append(
            "complain",
            formData.complaint
        );


        /* ADDRESS */

        const fullAddress =
            formData.city
                ? `${formData.address}, ${formData.city}`
                : formData.address;


        data.append(
            "address",
            fullAddress
        );


        /* IMAGE */

        if (image) {

            data.append(
                "image",
                image
            );

        }


        /* SEND TO SERVER */

        try {

            const res =
                await api.post(

                    "/add-patient",

                    data,

                    {
                        headers: {

                            "Content-Type":
                                "multipart/form-data"

                        }

                    }

                );


            console.log(
                res.data
            );


            alert(
                "Patient Added Successfully!"
            );


            /* Go to the patient list; it fetches the latest records automatically. */
            navigate("/PatientMngmt");


        }

        catch (err) {

            console.error(
                "Add patient error:",
                err
            );


            alert(

                err.response?.data?.message ||

                "Unable to add patient."

            );

        }

    };


    /* RENDER */

    return (

        <div className="overlay">

            <div className="modal">


                {/* HEADER */}

                <div className="header">

                    <div className="header-left">



                        <h2>
                            Add New Patient
                        </h2>

                    </div>

                </div>


                <p className="subtitle">

                    Enter the details of the new patient.

                </p>


                {/* PATIENT INFORMATION */}

                <div className="section">

                    <div className="section-title">

                        <span>
                            <FaUser />
                        </span>

                        <h4>
                            Patient Information
                        </h4>

                        <div className="line"></div>

                    </div>


                    <div className="grid-2">


                        {/* NAME */}

                        <div className="name-row">


                            {/* LAST NAME */}

                            <div className="input-group">

                                <label>
                                    Last Name
                                </label>

                                <input
                                    type="text"
                                    name="lastName"
                                    value={
                                        formData.lastName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter Last Name"
                                    required
                                />

                            </div>


                            {/* FIRST NAME */}

                            <div className="input-group">

                                <label>
                                    First Name
                                </label>

                                <input
                                    type="text"
                                    name="firstName"
                                    value={
                                        formData.firstName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter First Name"
                                    required
                                />

                            </div>


                            {/* MIDDLE NAME */}

                            <div className="input-group">

                                <label>
                                    Middle Name
                                </label>

                                <input
                                    type="text"
                                    name="middleName"
                                    value={
                                        formData.middleName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter Middle Name"
                                />

                            </div>

                        </div>


                        {/* AGE */}

                        <div>

                            <label>
                                Age
                            </label>

                            <input
                                type="number"
                                name="age"
                                value={
                                    formData.age
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter Age"
                                min="0"
                            />

                        </div>


                        {/* GENDER */}

                        <div>

                            <label>
                                Gender
                            </label>


                            <div className="radio-group">


                                <label>

                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Male"
                                        checked={
                                            formData.gender ===
                                            "Male"
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    Male

                                </label>


                                <label>

                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Female"
                                        checked={
                                            formData.gender ===
                                            "Female"
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    Female

                                </label>

                            </div>

                        </div>


                        {/* PHONE */}

                        <div>

                            <label>
                                Phone Number
                            </label>

                            <input
                                type="text"
                                name="contactNo"
                                value={
                                    formData.contactNo
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter Phone Number"
                            />

                        </div>


                        {/* OCCUPATION */}

                        <div>

                            <label>
                                Occupation
                            </label>

                            <input
                                type="text"
                                name="occupation"
                                value={
                                    formData.occupation
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter Occupation"
                            />

                        </div>


                        {/* IMAGE */}

                        <div className="full-width">

                            <label>
                                Upload Patient Image
                            </label>


                            <input
                                type="file"
                                name="patientImg"
                                accept="image/* " onChange={handleImageChange} /> <span className="reminder"> *Upload 2x2 Image (2MB max) </span> </div> </div> </div> {/* ADDRESS */}

                <div className="section">

                    <div className="section-title">

                        <span>
                            <FaMapMarkerAlt />
                        </span>

                        <h4>
                            Address
                        </h4>

                        <div className="line"></div>

                    </div>


                    <div className="grid-2">


                        {/* ADDRESS */}

                        <div>

                            <label>
                                Address
                            </label>

                            <input
                                type="text"
                                name="address"
                                value={
                                    formData.address
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter Address"
                            />

                        </div>


                        {/* CITY */}

                        <div>

                            <label>
                                City
                            </label>

                            <input
                                type="text"
                                name="city"
                                value={
                                    formData.city
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter City"
                            />

                        </div>

                    </div>

                </div>


                {/* ADDITIONAL INFORMATION */}

                <div className="section">

                    <div className="section-title">

                        <span>
                            <FaInfoCircle />
                        </span>

                        <h4>
                            Additional Information
                        </h4>

                        <div className="line"></div>

                    </div>


                    <div className="grid-2">


                        {/* COMPLAINT */}

                        <div>

                            <label>
                                Complaint
                            </label>

                            <input
                                type="text"
                                name="complaint"
                                value={
                                    formData.complaint
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter Complaint"
                            />

                        </div>


                        {/* STATUS */}

                        <div>

                            <label>
                                Status
                            </label>


                            <select
                                name="status"
                                value={
                                    formData.status
                                }
                                onChange={
                                    handleChange
                                }
                            >

                                <option value="Active">
                                    Active
                                </option>

                                <option value="Inactive">
                                    Inactive
                                </option>

                            </select>

                        </div>

                    </div>

                </div>


                {/* BUTTONS */}

                <div className="footer-save-canc">


                    <button
                        className="cancel"
                        type="button"
                    >

                        Cancel

                    </button>


                    <button
                        className="save"
                        type="button"
                        onClick={
                            handleSubmit
                        }
                    >

                        Save

                    </button>

                </div>


            </div>

        </div>

    );

}


export default AddPatient;
