"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const imageNameUpdater = __importStar(require("../src/ImageNameUpdater"));
const ImageName_1 = require("../src/ImageName");
describe("ImageNameUpdater tests", () => {
    const singleImageYaml = fs.readFileSync("C:/temp/testdata/singleImage.yaml").toString();
    const multipleImagesYaml = fs.readFileSync("C:/temp/testdata/multipleImages.yaml").toString();
    const imageName1 = new ImageName_1.ImageName("foo1/name1:bar1");
    const imageName2 = new ImageName_1.ImageName("foo2/name2:bar2");
    it("base case", () => __awaiter(this, void 0, void 0, function* () {
        const updatedYaml = imageNameUpdater.updateYamlContents(singleImageYaml, [imageName1]);
        expect(updatedYaml).toContain("foo1/name1:bar1");
    }));
    it("empty input yaml", () => __awaiter(this, void 0, void 0, function* () {
        const updatedYaml = imageNameUpdater.updateYamlContents("", [imageName1]);
        expect(updatedYaml).toBe("");
    }));
    it("no matching image name", () => __awaiter(this, void 0, void 0, function* () {
        const updatedYaml = imageNameUpdater.updateYamlContents(singleImageYaml, [imageName2]);
        expect(updatedYaml).toBe(singleImageYaml);
    }));
    it("no image names at all", () => __awaiter(this, void 0, void 0, function* () {
        const updatedYaml = imageNameUpdater.updateYamlContents(singleImageYaml, []);
        expect(updatedYaml).toBe(singleImageYaml);
    }));
    it("multiple images", () => __awaiter(this, void 0, void 0, function* () {
        const updatedYaml = imageNameUpdater.updateYamlContents(multipleImagesYaml, [imageName1, imageName2]);
        expect(updatedYaml).toContain("foo1/name1:bar1");
        expect(updatedYaml).toContain("foo2/name2:bar2");
        expect(updatedYaml).toContain("acr/someimage:v1");
    }));
});
