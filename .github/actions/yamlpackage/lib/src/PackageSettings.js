"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ImageName_1 = require("./ImageName");
class PackageSettings {
    constructor(getInput) {
        this.outputDirectory = getInput("outputDirectory");
        if (!this.outputDirectory) {
            throw new Error("No outputDirectory supplied to package.");
        }
        const manifestLines = getInput("manifests");
        if (!manifestLines) {
            throw new Error("No manifests supplied to package.");
        }
        this.manifests = PackageSettings.splitLines(manifestLines);
        this.images = [];
        const imageLines = getInput("images");
        if (imageLines) {
            const images = PackageSettings.splitLines(imageLines);
            for (let image of images) {
                this.images.push(new ImageName_1.ImageName(image));
            }
        }
    }
    updateDigests(imageDigestProvider) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.images || !imageDigestProvider) {
                return;
            }
            for (let imageName of this.images) {
                const digest = yield imageDigestProvider.getDigest(imageName);
                if (digest) {
                    imageName.digest = digest;
                }
            }
        });
    }
    static splitLines(linesToSplit) {
        if (!linesToSplit) {
            return [];
        }
        const lines = linesToSplit.split("\n");
        const result = [];
        for (let line of lines) {
            line = line.trim();
            if (line) {
                result.push(line);
            }
        }
        return result;
    }
}
exports.PackageSettings = PackageSettings;
