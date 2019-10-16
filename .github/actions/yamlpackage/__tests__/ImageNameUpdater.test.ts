import * as fs from "fs";
import * as imageNameUpdater from "../src/ImageNameUpdater";
import { ImageName } from "../src/ImageName";

describe("ImageNameUpdater tests", () => {
    const singleImageYaml: string = fs.readFileSync("C:/temp/testdata/singleImage.yaml").toString();
    const multipleImagesYaml: string = fs.readFileSync("C:/temp/testdata/multipleImages.yaml").toString();
    const imageName1: ImageName = new ImageName("foo1/name1:bar1");
    const imageName2: ImageName = new ImageName("foo2/name2:bar2");

    it("base case", async () => {
        const updatedYaml: string = imageNameUpdater.updateYamlContents(singleImageYaml, [imageName1]);
        expect(updatedYaml).toContain("foo1/name1:bar1");
    });
    it("empty input yaml", async () => {
        const updatedYaml: string = imageNameUpdater.updateYamlContents("", [imageName1]);
        expect(updatedYaml).toBe("");
    });
    it("no matching image name", async () => {
        const updatedYaml: string = imageNameUpdater.updateYamlContents(singleImageYaml, [imageName2]);
        expect(updatedYaml).toBe(singleImageYaml);
    });
    it("no image names at all", async () => {
        const updatedYaml: string = imageNameUpdater.updateYamlContents(singleImageYaml, []);
        expect(updatedYaml).toBe(singleImageYaml);
    });
    it("multiple images", async () => {
        const updatedYaml: string = imageNameUpdater.updateYamlContents(multipleImagesYaml, [imageName1, imageName2]);
        expect(updatedYaml).toContain("foo1/name1:bar1");
        expect(updatedYaml).toContain("foo2/name2:bar2");
        expect(updatedYaml).toContain("acr/someimage:v1");
    });
});
