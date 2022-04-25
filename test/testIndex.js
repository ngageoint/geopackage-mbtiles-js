var MBTilesToGeoPackage = require('../index').MBTilesToGeoPackage;

var path = require('path')
  , fs = require('fs')
  // , JSZip = require('jszip')
  , should = require('chai').should();

describe('MBTiles to GeoPackage tests', function() {

  after(function(done) {
    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'tiles.mbtiles'));
    } catch (e) {}
    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'osm.gpkg'));
    } catch (e) {}
    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'osm2.gpkg'));
    } catch (e) {}
    done();
  });

  it('should convert the mbtiles file into a geopackage', function(done) {
    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'osm.gpkg'));
    } catch (e) {}
    try {
      fs.mkdirSync(path.join(__dirname, 'fixtures', 'tmp'));
    } catch (e) {}
    const converter = new MBTilesToGeoPackage();

    converter.convert({
      mbtiles: path.join(__dirname, 'fixtures', 'osm.mbtiles'),
      geoPackage: path.join(__dirname, 'fixtures', 'tmp', 'osm.gpkg'),
      tableName: 'osm'
    }, function(status, callback) {
      callback();
    }).then(function(geopackage) {
      should.exist(geopackage);
      const tables = geopackage.getTileTables();
      tables.length.should.be.equal(1);
      tables[0].should.be.equal('osm');
      const tileDao = geopackage.getTileDao('osm');
      const count = tileDao.count();
      count.should.be.equal(85);
      done();
    });
  });

  it('should convert the mbtiles data into a geopackage', function(done) {
    this.timeout(0);

    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'osm.gpkg'));
    } catch (e) {}
    try {
      fs.mkdirSync(path.join(__dirname, 'fixtures', 'tmp'));
    } catch (e) {}

    const mbtilesData = fs.readFileSync(path.join(__dirname, 'fixtures', 'osm.mbtiles'));
    const converter = new MBTilesToGeoPackage();

    converter.convert({
      mbtilesData: mbtilesData,
      geoPackage: path.join(__dirname, 'fixtures', 'tmp', 'osm.gpkg')
    }, function(status, callback) {
      callback();
    }).then(geopackage => {
      should.exist(geopackage);
      const tables = geopackage.getTileTables();
      tables.length.should.be.equal(1);
      tables[0].should.be.equal('tiles');
      const tileDao = geopackage.getTileDao('tiles');
      const count = tileDao.count();
      count.should.be.equal(85);
      done();
    })
  });

  it('should convert the mbtiles file and add the layer twice', function(done) {
    this.timeout(0);
    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'osm2.gpkg'));
    } catch (e) {}
    try {
      fs.mkdirSync(path.join(__dirname, 'fixtures', 'tmp'));
    } catch (e) {}
    const converter = new MBTilesToGeoPackage()
    converter.convert({
      mbtiles: path.join(__dirname, 'fixtures', 'osm.mbtiles'),
      geoPackage: path.join(__dirname, 'fixtures', 'tmp', 'osm2.gpkg'),
      tableName: 'osm'
    }, function(status, callback) {
      callback();
    }).then(geopackage => {
      should.exist(geopackage);
      let tables = geopackage.getTileTables();
      tables.length.should.be.equal(1);
      tables[0].should.be.equal('osm');
      let tileDao = geopackage.getTileDao('osm');
      let count = tileDao.count();
      count.should.be.equal(85);
      converter.addLayer({
        mbtiles: path.join(__dirname, 'fixtures', 'osm.mbtiles'),
        geoPackage: path.join(__dirname, 'fixtures', 'tmp', 'osm2.gpkg'),
        tableName: 'osm_1'
      }, function(status, callback) {
        callback();
      }).then(geopackage => {
        should.exist(geopackage);
        tables = geopackage.getTileTables();
        tables.length.should.be.equal(2);
        tables[0].should.be.equal('osm');
        tables[1].should.be.equal('osm_1');
        tileDao = geopackage.getTileDao('osm_1');
        count = tileDao.count();
        count.should.be.equal(85);
        done();
      });
    });
  });

  it('should convert the mbtiles file and add the layer twice using the geopackage object the second time', function(done) {
    this.timeout(0);

    try {
      fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp', 'osm2.gpkg'));
    } catch (e) {}
    try {
      fs.mkdirSync(path.join(__dirname, 'fixtures', 'tmp'));
    } catch (e) {}

    const converter = new MBTilesToGeoPackage()
    converter.convert({
      mbtiles: path.join(__dirname, 'fixtures', 'osm.mbtiles'),
      geoPackage: path.join(__dirname, 'fixtures', 'tmp', 'osm2.gpkg'),
      tableName: 'osm'
    }, function(status, callback) {
      callback();
    }).then(geopackage => {
      should.exist(geopackage);
      let tables = geopackage.getTileTables();
      tables.length.should.be.equal(1);
      tables[0].should.be.equal('osm');
      let tileDao = geopackage.getTileDao('osm');
      let count = tileDao.count();
      count.should.be.equal(85);
      converter.addLayer({
        mbtiles: path.join(__dirname, 'fixtures', 'osm.mbtiles'),
        geoPackage: geopackage,
        tableName: 'osm_1'
      }, function(status, callback) {
        callback();
      }).then(geopackage => {
        should.exist(geopackage);
        tables = geopackage.getTileTables();
        tables.length.should.be.equal(2);
        tables[0].should.be.equal('osm');
        tables[1].should.be.equal('osm_1');
        tileDao = geopackage.getTileDao('osm_1');
        count = tileDao.count();
        count.should.be.equal(85);
        done();
      });
    });
  });
});
