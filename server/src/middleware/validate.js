function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({ success: false, message });
    }

    req.body = value;
    return next();
  };
}

module.exports = { validate };
