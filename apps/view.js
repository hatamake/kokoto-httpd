module.exports = function(config, express, models) {
    express.get('/view/:id', function(req, res) {
        var id = req.params.id;
        res.autoRender('view', {});
    });
};