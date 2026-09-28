exports.adminMiddleware = (requiredPermission = null) => {
  return (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (admin.role === "superadmin") return next();

    if (requiredPermission && !admin.permissions[requiredPermission]) {
      return res.status(403).json({ message: "Permission denied" });
    }

    next();
  };
};
