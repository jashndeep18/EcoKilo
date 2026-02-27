export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.profile || !req.profile.role) {
            return res.status(403).json({ error: 'Role not found on user profile' });
        }

        const userRole = req.profile.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: `Access denied. Required role(s): ${allowedRoles.join(' OR ')}, Found: ${userRole}`
            });
        }

        next();
    };
};
