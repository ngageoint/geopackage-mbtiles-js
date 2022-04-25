import {
  GeoPackage,
  GeoPackageAPI,
  BoundingBox,
  DBAdapter,
  setCanvasKitWasmLocateFile,
  GeoPackageConnection,
} from '@ngageoint/geopackage';
import fs from 'fs';
import path from 'path';

const isNode = typeof window === 'undefined'
if (isNode) {
  setCanvasKitWasmLocateFile(file => {
    return path.join(__dirname, file);
  });
}

export interface MBTilesConverterOptions {
  append?: boolean;
  geoPackage?: string;
  mbtiles?: string;
  mbtilesData?: Buffer;
  tableName?: string;
}

export class MBTilesToGeoPackage {
  constructor(private options?: MBTilesConverterOptions) {}

  async addLayer(options?: MBTilesConverterOptions, progressCallback?: Function): Promise<any> {
    const clonedOptions = { ...this.options, ...options };
    clonedOptions.append = true;
    return this.setupConversion(clonedOptions, progressCallback);
  }

  async convert(options?: MBTilesConverterOptions, progressCallback?: Function): Promise<GeoPackage> {
    const clonedOptions = { ...this.options, ...options };
    clonedOptions.append = false;
    return this.setupConversion(clonedOptions, progressCallback);
  }

  determineFormatFromTile(db: DBAdapter): string {
    let format = null;
    const row = db.get('SELECT tile_data FROM tiles');
    if (row && row.tile_data) {
      if (row.tile_data.length > 3) {
        format = row.tile_data[0] === 255 && row.tile_data[1] === 216 && row.tile_data[2] === 255 ? 'jpg' : 'png';
      }
    }
    return format;
  }

  getInfo(
    db: DBAdapter,
  ): { bounds: Array<number>; format: string; minzoom: number; maxzoom: number; center: Array<number> } {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    const info: { bounds: Array<number>; format: string; minzoom: number; maxzoom: number; center: Array<number> } = {};
    try {
      db.all('SELECT name, value FROM metadata').forEach(function(row) {
        switch (row.name) {
          case 'json':
            try {
              const jsondata = JSON.parse(row.value);
              Object.keys(jsondata).reduce(function(memo, key) {
                memo[key] = memo[key] || jsondata[key];
                return memo;
              }, info);
              // eslint-disable-next-line no-empty
            } catch (err) {}
            break;
          case 'minzoom':
          case 'maxzoom':
            info[row.name] = parseInt(row.value, 10);
            break;
          case 'center':
          case 'bounds':
            info[row.name] = row.value.split(',').map(parseFloat);
            break;
          default:
            info[row.name] = row.value;
            break;
        }
      });
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to determine MBTiles metadata.');
    }
    if (info.bounds == null) {
      info.bounds = [-180, -90, 180, 90];
    }
    if (info.format == null) {
      try {
        info.format = this.determineFormatFromTile(db);
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to determine MBTiles format.');
      }
    }
    return info;
  }

  async setupConversion(options: MBTilesConverterOptions, progressCallback?: Function): Promise<GeoPackage> {
    try {
      const db: DBAdapter = await this.openMBTilesDb(options.mbtiles || options.mbtilesData);
      const geoPackage: GeoPackage = await this.createOrOpenGeoPackage(options.geoPackage, options)

      const info = this.getInfo(db);
      geoPackage.createRequiredTables();

      // pbf is the only format not supported
      if (info.format !== 'pbf') {
        const minZoom = info.minzoom || 0;
        const maxZoom = info.maxzoom || 20;
        const name = options.tableName || 'tiles';
        const bb = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244);
        geoPackage.createStandardWebMercatorTileTable(name, bb, 3857, bb, 3857, minZoom, maxZoom, 256);
        const tileDao = geoPackage.getTileDao(name);
        const newRow = tileDao.newRow();
        const iterator = db.each('select * from tiles')
        for (const row of iterator) {
          newRow.resetId();
          newRow.tileRow = (1 << row.zoom_level) - 1 - row.tile_row;
          newRow.tileColumn = row.tile_column;
          newRow.zoomLevel = row.zoom_level;
          newRow.tileData = row.tile_data;
          tileDao.create(newRow);
        }
      }

      return geoPackage;
    } catch (e) {
      console.error(e);
      throw new Error('Unable to perform conversion.');
    }
  }

  async openMBTilesDb(mbtiles: string | Buffer): Promise<DBAdapter> {
    try {
      const connection = await GeoPackageConnection.connect(mbtiles);
      return connection.adapter;
    } catch (e) {
      console.error(e)
      throw new Error('MBTiles file is not valid.');
    }
  }

  async createOrOpenGeoPackage(
      geoPackage: GeoPackage | string,
      options: MBTilesConverterOptions,
      progressCallback?: Function,
  ): Promise<GeoPackage> {
    if (typeof geoPackage === 'object') {
      if (progressCallback) await progressCallback({ status: 'Opening GeoPackage' });
      return geoPackage;
    } else {
      let stats;
      try {
        stats = fs.statSync(geoPackage);
      } catch (e) {}
      if (stats && !options.append) {
        throw new Error('GeoPackage file already exists, refusing to overwrite ' + geoPackage);
      } else if (stats) {
        return GeoPackageAPI.open(geoPackage);
      }
      if (progressCallback) await progressCallback({ status: 'Creating GeoPackage' });
      return GeoPackageAPI.create(geoPackage);
    }
  }
}
