var fs = require('fs');
var path = require('path');

function copyFile(fileName) {
	var inputFile = path.resolve(rootDir, fileName);
	var outputFile = path.resolve(distDirectory, fileName);
	fs.writeFileSync(outputFile, fs.readFileSync(inputFile));
}

var rootDir = path.resolve(__dirname, '..');
var pkg = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8'));

var whiteListProdKeys = [
	'author',
	'bin',
	'bugs',
	'contributors',
	'cpu',
	'dependencies',
	'description',
	'files',
	'homepage',
	'keywords',
	'license',
	'main',
	'man',
	'name',
	'os',
	'peerDependencies',
	'readme',
	'repository',
	'typings',
	'version',
	'yargs',
];

Object.keys(pkg).forEach(function(key) {
	if (whiteListProdKeys.indexOf(key) === -1) {
		delete pkg[key];
	}
});

// private is used to prevent publishing
pkg.private = true;

var distDirectory = path.resolve(rootDir, 'dist');
if (!fs.existsSync(distDirectory)) {
	fs.mkdirSync(distDirectory);
}

copyFile('README.md');
copyFile('LICENSE');

fs.writeFileSync(
	path.resolve(distDirectory, 'package.json'),
	JSON.stringify(pkg, null, 2)
);
