
export function joi(err, _req, res, next) {
    if (err && err.error && err.error.isJoi) {
        res.status(400).json({
            type: err.type,
            message: err.error.toString()
        });
    } else {
        next(err);
    }
}

const _default = (_req, res) => {
    res.status(404);
    res.send('Not found');
};
export { _default as default };
