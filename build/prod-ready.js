var fs = require('fs');
var path = require('path');

var pkg = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, '..', 'dist', 'package.json'),
		'utf-8'
	)
);

// private is used to prevent publishing
delete pkg.private;

fs.writeFileSync(
	path.resolve(__dirname, '..', 'dist', 'package.json'),
	JSON.stringify(pkg, null, 2)
);
