import { ArrowRight } from "lucide-react";

const projects = [
  {
    name: "Tabuk Villas",
    status: "In Progress",
    progress: 72,
  },
  {
    name: "Riyadh Tower",
    status: "Planning",
    progress: 20,
  },
  {
    name: "Jeddah Hotel",
    status: "Completed",
    progress: 100,
  },
];

function ProjectsGrid() {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-6">

      <div className="flex justify-between items-center mb-6">

        <h2 className="text-2xl font-bold">
          Projects
        </h2>

        <button className="text-blue-600 flex items-center gap-2 hover:gap-3 transition-all">

          View All

          <ArrowRight size={18} />

        </button>

      </div>

      <div className="space-y-5">

        {projects.map((project) => (

          <div
            key={project.name}
            className="border rounded-2xl p-5 hover:shadow-md transition"
          >

            <div className="flex justify-between">

              <div>

                <h3 className="font-semibold text-lg">
                  {project.name}
                </h3>

                <p className="text-gray-500">
                  {project.status}
                </p>

              </div>

              <span className="font-bold">
                {project.progress}%
              </span>

            </div>

            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">

              <div
                className="h-full bg-blue-600"
                style={{
                  width: `${project.progress}%`,
                }}
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default ProjectsGrid;