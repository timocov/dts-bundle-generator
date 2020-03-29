import * as path from 'path';
import * as fs from 'fs';
import { generateDtsBundle } from "./bundle-generator";
import { loadConfigFile } from './config-file/load-config-file';
import { fixPath } from './helpers/fix-path';

interface Compiler {
  hooks: {
    emit: {
      tapAsync(key: string, func: (compilation: Compilation, callback: (()=>void)) => void): void;
    }
  }

  options?: {
    output?: {
      path: string;
    }
  }
}

interface Compilation {
  chunks: Chunk[]
}

interface Chunk {
  entryModule: {
    id: string
  }
  files: string[]
}

export class WebpackPlugin {

  constructor(public configPath?: string) { }

  generateOutFileName(inputFilePath: string): string {
    const inputFileName = path.parse(inputFilePath).name;
    return fixPath(path.join(inputFilePath, '..', inputFileName + '.d.ts'));
  }

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapAsync('DtsBundleGenerator.WebpackPlugin', (compilation, callback) => {
      if (typeof this.configPath === 'undefined') {
        compilation.chunks.forEach(chunk => {
          const entry = chunk.entryModule.id;
          if (path.extname(entry) !== '.ts') return;
  
          const filename = chunk.files[0];
          const targetFile = path.basename(filename, path.extname(filename)) + '.d.ts';
          const output = compiler.options?.output?.path
          if (typeof output === 'undefined') return;
  
          const targetPath = path.join(output, targetFile);
          const dts = generateDtsBundle([{ filePath: entry }]);
          fs.writeFileSync(targetPath, dts);
        });  
      } else {
        const bundlerConfig = loadConfigFile(this.configPath);
        bundlerConfig.entries.forEach(config => {
          const dts = generateDtsBundle([config], bundlerConfig.compilationOptions);
          const targetPath = config.outFile ?? this.generateOutFileName(config.filePath);
          fs.writeFileSync(targetPath, dts);
        })
      }
      callback();
    });
  }
}
