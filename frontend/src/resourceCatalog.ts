type Lesson = {
  title: string
  href: string
  practice: string
}
type Resource = {
  id: string
  title: string
  source: string
  description: string
  domains: string[]
  kind: "Learning" | "Tools" | "Research"
  href: string
  level?: string
  lessons?: Lesson[]
}

export const resources: Resource[] = [
  {
    id: "python",
    title: "Python for Aerospace Telemetry & Data Analysis",
    source: "Python · NumPy · Matplotlib",
    kind: "Learning",
    domains: ["All domains"],
    level: "Beginner",
    description:
      "Go from your first script to analysing and plotting sensor readings.",
    href: "https://docs.python.org/3/tutorial/",
    lessons: [
      {
        title: "Variables, loops & functions",
        href: "https://docs.python.org/3/tutorial/",
        practice:
          "Write a function that converts altitude readings from metres to kilometres.",
      },
      {
        title: "Work with numerical data",
        href: "https://numpy.org/doc/stable/user/absolute_beginners.html",
        practice:
          "Calculate the mean and maximum of a small set of sensor readings.",
      },
      {
        title: "Telemetry Data Visualization",
        href: "https://matplotlib.org/stable/tutorials/pyplot.html",
        practice:
          "Plot altitude against time, with labels and units on both axes.",
      },
    ],
  },
  {
    id: "electronics",
    title: "Electronics & embedded systems",
    source: "Arduino documentation",
    kind: "Learning",
    domains: ["CANSAT", "CUBESAT", "ROBOTICS", "ROVERS"],
    level: "Beginner",
    description:
      "Learn digital inputs, analogue signals, and serial telemetry before building a payload.",
    href: "https://docs.arduino.cc/built-in-examples/",
    lessons: [
      {
        title: "Basic Circuit Theory & Digital Input/Output",
        href: "https://docs.arduino.cc/built-in-examples/basics/Blink/",
        practice:
          "Read the blink example and identify the setup and loop functions.",
      },
      {
        title: "Read an analogue sensor",
        href: "https://docs.arduino.cc/built-in-examples/basics/AnalogReadSerial/",
        practice:
          "Explain how analogue readings become digital values. Simulate before wiring.",
      },
      {
        title: "Send structured telemetry",
        href: "https://docs.arduino.cc/language-reference/en/functions/communication/serial/",
        practice:
          "Design a serial message containing a timestamp, reading, and unit.",
      },
    ],
  },
  {
    id: "cubesat",
    title: "CubeSat mission design",
    source: "Cal Poly CubeSat · NASA",
    kind: "Learning",
    domains: ["CUBESAT"],
    level: "Beginner",
    description:
      "Explore CubeSat form factors, subsystem requirements, and mission planning before designing an orbital payload.",
    href: "https://www.cubesat.org/cubesatinfo",
    lessons: [
      {
        title: "Understand CubeSat design standards",
        href: "https://www.cubesat.org/cubesatinfo",
        practice:
          "Read the current design specification. Record the dimensions, mass limits, and interfaces relevant to your proposed form factor.",
      },
      {
        title: "Map your spacecraft subsystems",
        href: "https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf",
        practice:
          "Use NASA’s CubeSat 101 handbook to outline power, communications, thermal control, attitude control, and payload requirements. Draft a first power budget.",
      },
      {
        title: "Draft a mission concept & test plan",
        href: "https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/",
        practice:
          "Define your mission objective, success criteria, and ground-test plan. Review programme eligibility separately; this session does not provide launch approval.",
      },
    ],
  },
  {
    id: "rocket",
    title: "Rocket flight fundamentals",
    source: "NASA Glenn · OpenRocket",
    kind: "Learning",
    domains: ["ROCKET"],
    level: "Beginner",
    description:
      "Explore forces, stability, and flight simulation. A theory-first path, not launch certification.",
    href: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/",
    lessons: [
      {
        title: "Explore flight & propulsion",
        href: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/",
        practice: "Sketch the forces acting on a rocket during ascent.",
      },
      {
        title: "Flight Simulation Software Configuration",
        href: "https://openrocket.info/documentation.html",
        practice:
          "Review the user guide and identify mass, drag, and stability inputs.",
      },
      {
        title: "Compare simulated designs",
        href: "https://openrocket.info/",
        practice:
          "Compare two simulated designs and record how one parameter changes the results.",
      },
    ],
  },
  {
    id: "robotics",
    title: "ROS 2 & robot simulation",
    source: "ROS 2 · Gazebo",
    kind: "Learning",
    domains: ["ROBOTICS", "ROVERS"],
    level: "Intermediate",
    description:
      "Learn the language of robot software: nodes, topics, and simulation-first testing.",
    href: "https://docs.ros.org/en/jazzy/Tutorials.html",
    lessons: [
      {
        title: "Understand nodes & topics",
        href: "https://docs.ros.org/en/jazzy/Tutorials.html",
        practice:
          "Draw a publisher/subscriber diagram for a rover’s sensor data.",
      },
      {
        title: "Build a simple ROS 2 workspace",
        href: "https://docs.ros.org/en/jazzy/Tutorials/Beginner-Client-Libraries.html",
        practice:
          "Follow the beginner client-library tutorials to build a simple package.",
      },
      {
        title: "Explore a simulated world",
        href: "https://gazebosim.org/docs/harmonic/tutorials/",
        practice:
          "Follow a Gazebo tutorial and document one simulated robot behaviour.",
      },
    ],
  },
  {
    id: "digitaltwin",
    title: "Robotics digital twin with Gazebo",
    source: "Gazebo · ROS 2",
    kind: "Learning",
    domains: ["ROBOTICS", "ROVERS"],
    level: "Intermediate",
    description:
      "Build a virtual robot, bridge simulation data, and compare it with physical measurements. A digital twin needs calibration and a data connection—not just a 3D model.",
    href: "https://gazebosim.org/docs/harmonic/",
    lessons: [
      {
        title: "Build your robot’s simulation model",
        href: "https://gazebosim.org/docs/harmonic/building_robot/",
        practice:
          "Follow the building-a-robot tutorial. Match geometry, joints, mass, and inertia to a documented robot or rover design.",
      },
      {
        title: "Bridge Gazebo & ROS 2 data",
        href: "https://gazebosim.org/docs/harmonic/ros2_integration/",
        practice:
          "Set up the ROS–Gazebo bridge locally. Inspect a simulated sensor topic and record its units, reference frame, and update rate.",
      },
      {
        title: "Validate your digital-twin assumptions",
        href: "https://gazebosim.org/docs/harmonic/sensors/",
        practice:
          "Compare simulated sensor output with safely recorded physical measurements. Document error, noise, calibration changes, and how a future live data connection would stay synchronised.",
      },
    ],
  },
  {
    id: "drones",
    title: "Autonomous flight essentials",
    source: "PX4 documentation",
    kind: "Learning",
    domains: ["DRONES"],
    level: "Intermediate",
    description:
      "Understand flight controllers and test a virtual aircraft before working with hardware.",
    href: "https://docs.px4.io/main/en/",
    lessons: [
      {
        title: "Understand the flight stack",
        href: "https://docs.px4.io/main/en/getting_started/px4_basic_concepts.html",
        practice:
          "Identify the roles of a flight controller, sensors, and ground station.",
      },
      {
        title: "Set up a simulation",
        href: "https://docs.px4.io/main/en/simulation/",
        practice:
          "Review the simulator options and choose one compatible with your computer.",
      },
      {
        title: "Plan a virtual mission",
        href: "https://docs.px4.io/main/en/flying/missions.html",
        practice:
          "Plan a simulated mission with waypoints and a safe return procedure.",
      },
    ],
  },
  {
    id: "research",
    title: "Research & project collaboration",
    source: "NASA NTRS · GitHub Skills",
    kind: "Learning",
    domains: ["All domains"],
    level: "Beginner",
    description:
      "Find credible technical sources and keep your team’s work reproducible and organised.",
    href: "https://ntrs.nasa.gov/",
    lessons: [
      {
        title: "Find a technical reference",
        href: "https://ntrs.nasa.gov/",
        practice:
          "Find a report relevant to your domain and record its title, author, and year.",
      },
      {
        title: "Learn GitHub collaboration",
        href: "https://skills.github.com/",
        practice:
          "Complete Introduction to GitHub and create a project README.",
      },
      {
        title: "Document a reproducible experiment",
        href: "https://www.overleaf.com/learn/latex/Tutorials",
        practice:
          "Draft a short report with a question, method, results, and cited sources.",
      },
    ],
  },
  {
    id: "nasa",
    title: "NASA Educational & Academic Repository",
    source: "NASA",
    kind: "Research",
    domains: ["All domains"],
    description:
      "Space science activities, educator materials, and student opportunities from NASA.",
    href: "https://www.nasa.gov/learning-resources/",
  },
  {
    id: "esa",
    title: "ESA Educational Programmes & Technical Archives",
    source: "European Space Agency",
    kind: "Research",
    domains: ["CANSAT", "CUBESAT", "ROCKET", "ROBOTICS", "ROVERS"],
    description:
      "Educational projects, CanSat guidance, and opportunities. Check each programme’s eligibility and dates.",
    href: "https://www.esa.int/Education",
  },
  {
    id: "isro",
    title: "ISRO Space Research & Missions Ecosystem",
    source: "ISRO",
    kind: "Research",
    domains: ["All domains"],
    description:
      "Explore Indian missions, public technical information, and official student programme announcements.",
    href: "https://www.isro.gov.in/",
  },
  {
    id: "ntrs",
    title: "NASA technical reports",
    source: "NASA NTRS",
    kind: "Research",
    domains: ["All domains"],
    description:
      "Search public aerospace research reports to support your literature review and project decisions.",
    href: "https://ntrs.nasa.gov/",
  },
  {
    id: "arxiv",
    title: "arXiv Scientific Preprints Archive",
    source: "arXiv",
    kind: "Research",
    domains: ["All domains"],
    description:
      "Read free preprints in physics, engineering, and computer science. Preprints may not be peer-reviewed.",
    href: "https://arxiv.org/",
  },
  {
    id: "mit",
    title: "MIT OpenCourseWare Academic Archive",
    source: "MIT OpenCourseWare",
    kind: "Research",
    domains: ["All domains"],
    description:
      "Free lecture notes, assignments, and selected videos in maths, physics, and engineering. No course credit or certificate.",
    href: "https://ocw.mit.edu/",
  },
  {
    id: "cubesatstandards",
    title: "CubeSat design standards",
    source: "Cal Poly CubeSat programme",
    kind: "Research",
    domains: ["CUBESAT"],
    description:
      "Find the current CubeSat Design Specification and deployment-interface references. Confirm requirements with your intended provider before finalising a design.",
    href: "https://www.cubesat.org/cubesatinfo",
  },
  {
    id: "cubesathandbook",
    title: "NASA CubeSat 101 handbook",
    source: "NASA · Free PDF",
    kind: "Research",
    domains: ["CUBESAT"],
    description:
      "A practical introduction to CubeSat development, mission planning, subsystems, integration, and testing. Read alongside current design and provider requirements.",
    href: "https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf",
  },
  {
    id: "openrocket",
    title: "OpenRocket",
    source: "Open-source flight simulation",
    kind: "Tools",
    domains: ["ROCKET"],
    description:
      "Design and simulate model rockets. Review stability and performance before supervised hardware work.",
    href: "https://openrocket.info/",
  },
  {
    id: "freecad",
    title: "FreeCAD",
    source: "Open-source mechanical CAD",
    kind: "Tools",
    domains: ["All domains"],
    description:
      "Create parametric parts, chassis, and assemblies with a free desktop CAD tool.",
    href: "https://www.freecad.org/",
  },
  {
    id: "kicad",
    title: "KiCad",
    source: "Open-source electronics design",
    kind: "Tools",
    domains: ["CANSAT", "CUBESAT", "DRONES", "ROBOTICS", "ROVERS"],
    description:
      "Draw circuit schematics and design printed circuit boards using free desktop software.",
    href: "https://www.kicad.org/",
  },
  {
    id: "wokwi",
    title: "Wokwi circuit simulator",
    source: "Browser-based prototyping",
    kind: "Tools",
    domains: ["CANSAT", "CUBESAT", "ROBOTICS", "ROVERS"],
    description:
      "Practise Arduino and sensor circuits in your browser. A free personal tier is available; paid features are optional.",
    href: "https://wokwi.com/",
  },
  {
    id: "gazebo",
    title: "Gazebo robotics simulator",
    source: "Open-source robotics",
    kind: "Tools",
    domains: ["DRONES", "ROBOTICS", "ROVERS"],
    description:
      "Create robot worlds, simulate dynamics and sensors, and test behaviours. Install Gazebo locally; this resource does not run a simulator inside the app.",
    href: "https://gazebosim.org/",
  },
  {
    id: "gazebobridge",
    title: "ROS 2–Gazebo digital-twin bridge",
    source: "Gazebo integration documentation",
    kind: "Tools",
    domains: ["ROBOTICS", "ROVERS", "DRONES"],
    description:
      "Connect ROS 2 and Gazebo topics for simulation workflows. Use this as a starting point for a calibrated digital twin; physical-robot data integration needs separate setup.",
    href: "https://gazebosim.org/docs/harmonic/ros2_integration/",
  },
  {
    id: "ardupilot",
    title: "ArduPilot documentation",
    source: "Open-source autopilot",
    kind: "Tools",
    domains: ["DRONES", "ROVERS"],
    description:
      "Reference documentation for autonomous vehicles, simulation, and flight-stack configuration.",
    href: "https://ardupilot.org/ardupilot/",
  },
]

export const lessonIds = resources.flatMap(
  (resource) =>
    resource.lessons?.map((_, index) => `${resource.id}-${index + 1}`) || [],
)
export const learningPathCount = resources.filter(
  (resource) => resource.lessons,
).length
export const learningSessionCount = lessonIds.length
