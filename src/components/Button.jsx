// src/components/Button.jsx
import React from "react";

const Button = ({ children, variant = "primary", ...rest }) => {
  const className =
    variant === "secondary" ? "btn btn-secondary" : "btn";

  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
};

export default Button;
