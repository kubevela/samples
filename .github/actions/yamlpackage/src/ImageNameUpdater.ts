import * as yaml from "js-yaml";
import { ImageName } from "./ImageName";

export function updateYamlContents(fileContents: string, images: ImageName[]): string {
    if (!images) {
        return fileContents;
    }

    const yamlContents: any = yaml.safeLoad(fileContents);
    if (!yamlContents || !yamlContents.kind || !yamlContents.spec ||
        !yamlContents.kind.toString().toLowerCase().startsWith("component") ||
        !yamlContents.spec.containers || yamlContents.spec.containers.length < 1) {
        return fileContents;
    }

    let updatedImageName: boolean = false;
    for (let container of yamlContents.spec.containers) {
        if (container && container.image) {
            const currentName: ImageName = new ImageName(container.image);
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
        const updatedContents: string = JSON.stringify(yamlContents);
        return updatedContents;
    } else {
        return fileContents;
    }
}