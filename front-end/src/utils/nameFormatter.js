export const buildFullName = (lastName, firstName, middleName = "") => {
  const last = lastName.trim();
  const first = firstName.trim();
  const middle = middleName.trim();

  return `${last}, ${first}${middle ? " " + middle : ""}`;
};

export const splitFullName = (fullname = "") => {
  const [last = "", remaining = ""] = fullname.split(",");

  const parts = remaining.trim().split(" ");

  return {
    lastName: last.trim(),
    firstName: parts[0] || "",
    middleName: parts.slice(1).join(" "),
  };
};
