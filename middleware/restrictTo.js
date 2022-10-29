const restrictTo = (...roles) => {
    return (req, res, next) => {
        console.log(roles)
        console.log(req.user.role)
        if (!roles.includes(req.user.role.toString())) {
            return res.status(404).send("Unauthorized")
        }

        next();
    };
};

export default restrictTo;