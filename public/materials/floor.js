// import shaderFragment from "../shaders/floor/fragment.glsl";
// import shaderVertex from "../shaders/floor/vertex.glsl";

export default function () {
  const uniforms = {
    tBackground: { value: null },
  };

  const material = new THREE.ShaderMaterial({
    wireframe: false,
    transparent: false,
    uniforms,
    // vertexShader: shaderVertex,
    // fragmentShader: shaderFragment,
    vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vec3 newPosition = position;
      newPosition.z = 1.0;
      gl_Position = vec4(newPosition, 1.0);
    }`,
    fragmentShader: `
    uniform sampler2D tBackground;
    varying vec2 vUv;
    void main(){
      vec4 backgroundColor = texture2D(tBackground, vUv);
      gl_FragColor = backgroundColor;
    }`,
  });

  return material;
}
