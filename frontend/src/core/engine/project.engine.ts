import { Project, Asset } from "../../types/project";

export class ProjectEngine {

  getProjects(): Project[] {
    return [];
  }

  getProject(id: string) {
    return null;
  }

  getAssets(projectId: string): Asset[] {
    return [];
  }

}

export const projectEngine =
  new ProjectEngine();