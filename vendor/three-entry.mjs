// version v1.0
// Source for the checked-in browser bundle. Three.js is pinned to 0.180.0 (MIT).
// The app loads the bundle locally only when a 3D game is requested.
export {
  WebGLRenderer, Scene, Color, Fog, Group, Object3D,
  PerspectiveCamera, OrthographicCamera, HemisphereLight, DirectionalLight,
  Mesh, InstancedMesh, MeshStandardMaterial, MeshBasicMaterial,
  BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry,
  PlaneGeometry, CircleGeometry, Shape, ExtrudeGeometry,
  BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial,
  CanvasTexture, Vector2, Vector3, Quaternion, Matrix4, Box3, Plane, Raycaster,
  PCFSoftShadowMap, SRGBColorSpace, ACESFilmicToneMapping, DoubleSide,
} from 'three';
