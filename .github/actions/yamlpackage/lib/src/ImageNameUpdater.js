"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = __importStar(require("js-yaml"));
const ImageName_1 = require("./ImageName");
function updateYamlContents(fileContents, images) {
    if (!images) {
        return fileContents;
    }
    const yamlContents = yaml.safeLoad(fileContents);
    if (!yamlContents || !yamlContents.kind || !yamlContents.spec ||
        !yamlContents.kind.toString().toLowerCase().startsWith("component") ||
        !yamlContents.spec.containers || yamlContents.spec.containers.length < 1) {
        return fileContents;
    }
    let updatedImageName = false;
    for (let container of yamlContents.spec.containers) {
        if (container && container.image) {
            const currentName = new ImageName_1.ImageName(container.image);
            for (let imageName of images) {
                if (currentName.repository === imageName.repository) {
                    container.image = imageName.toString();
                    updatedImageName = true;
                    break;
                }
            }
        }
    }
    if (updatedImageName) {
        const updatedContents = JSON.stringify(yamlContents);
        return updatedContents;
    }
    else {
        return fileContents;
    }
}
exports.updateYamlContents = updateYamlContents;
