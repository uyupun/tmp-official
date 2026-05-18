#version 300 es
precision mediump float;

uniform sampler2D u_tex;
uniform vec2 u_pixelSize;

in vec2 v_uv;
out vec4 fragColor;

vec4 chromaticAberration(vec2 uv) {
  float r = texture(u_tex, uv - vec2(u_pixelSize.x * 2.0, 0.0)).r;
  float g = texture(u_tex, uv).g;
  float b = texture(u_tex, uv + vec2(u_pixelSize.x * 2.0, 0.0)).b;
  float a = texture(u_tex, uv).a;
  return vec4(r, g, b, a);
}

vec3 colorGrade(vec3 color) {
  float lum = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  return vec3(
    mix(lum, color.r, 0.45) * 1.08,
    mix(lum, color.g, 0.45) * 0.95,
    mix(lum, color.b, 0.45) * 0.95
  );
}

void main() {
  vec4 color = chromaticAberration(v_uv);
  fragColor = vec4(clamp(colorGrade(color.rgb), 0.0, 1.0), color.a);
}
