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
const ImageName_1 = require("../src/ImageName");
describe("ImageName parsing tests", () => {
    it("contoso.azurecr.io/helloworld:latest", () => __awaiter(this, void 0, void 0, function* () {
        checkImageName("contoso.azurecr.io/helloworld:latest", "helloworld", "contoso.azurecr.io", "latest", "");
    }));
    it("helloworld", () => __awaiter(this, void 0, void 0, function* () {
        checkImageName("helloworld", "helloworld", "", "", "");
    }));
    it("helloworld:v101", () => __awaiter(this, void 0, void 0, function* () {
        checkImageName("helloworld:v101", "helloworld", "", "v101", "");
    }));
    it("acr/helloworld", () => __awaiter(this, void 0, void 0, function* () {
        checkImageName("acr/helloworld", "helloworld", "acr", "", "");
    }));
    it("acr/helloworld:v1@sha256:3990808930981", () => __awaiter(this, void 0, void 0, function* () {
        checkImageName("acr/helloworld", "helloworld", "acr", "", "sha256:3990808930981");
    }));
});
function checkImageName(testName, repository, registry, tag, digest) {
    const image = new ImageName_1.ImageName(testName);
    expect(image.registry).toBe(registry);
    expect(image.repository).toBe(repository);
    expect(image.tag).toBe(tag);
    expect(image.toString()).toBe(testName);
}
