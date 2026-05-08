#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_focalJitter1;
uniform vec2 u_focalJitter2;

out vec4 fragColor;

const float TAU  = 6.28318;
const float PHI1 = 2.09440; // TAU / 3
const float PHI2 = 4.18879; // TAU * 2 / 3

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 frac = fract(p);
  frac = frac * frac * (3.0 - 2.0 * frac);
  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), frac.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), frac.x),
    frac.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.1 + vec2(3.1, 1.7);
    amplitude *= 0.5;
  }
  return value;
}

// フラグメント座標を [0,1] のUVに変換し、x軸をアスペクト比でスケールする（リングが縦横で歪まないようにするため）
vec2 toAspectUV(vec2 fragCoord, vec2 res) {
  vec2 uv = fragCoord / res;
  uv.x *= res.x / res.y;
  return uv;
}

// FBMで座標を時間変化させながら歪ませる（リングのエッジに有機的なゆらぎを与える）
vec2 warpUV(vec2 p, float time) {
  float warpX = fbm(p * 0.8 + vec2(time * 0.07, time * 0.04));
  float warpY = fbm(p * 0.8 + vec2(3.7, 2.1) + vec2(time * 0.04, -time * 0.06));
  return p + (vec2(warpX, warpY) - 0.5) * 0.55;
}

// 2焦点からの距離を重み付け合成し、同心円状のリング位相を生成する（時間で位相をずらすことでリングが流れるように見える）
float ringPhase(float dist1, float dist2, float time) {
  float weight1 = exp(-dist1 * 1.4);
  float weight2 = exp(-dist2 * 2.2);
  float totalWeight = weight1 + weight2 + 0.001;
  float phase = (weight1 * dist1 * 3.5 + weight2 * (dist2 * 3.5 + 2.0)) / totalWeight;
  return phase - time * 0.22;
}

// 焦点に近いほど強くなるスカラー値を返す（焦点の直近だけを鋭く白飛びさせるために使う）
float centerProximity(float dist1, float dist2) {
  float glow1 = exp(-dist1 * 3.5);
  float glow2 = exp(-dist2 * 4.2);
  float proximity = clamp(glow1 + glow2, 0.0, 1.0);
  return proximity * proximity;
}

// 位相をRGBコサイン関数に通して虹色を生成し、シマーで明度ゆらぎを乗せる
vec3 iridescentColor(float phase, float shimmer) {
  float colorBrightness = 0.48;
  float colorSaturation = 0.42;
  float angle = fract(phase) * TAU;
  vec3 color = vec3(
    colorBrightness + colorSaturation * cos(angle),
    colorBrightness + colorSaturation * cos(angle + PHI1),
    colorBrightness + colorSaturation * cos(angle + PHI2)
  );
  color *= 0.80 + shimmer;
  return mix(color, vec3(1.0), 0.07);
}

// リングの境界に1px幅の白い等高線を重ねる
vec3 applyContour(vec3 color, float phase) {
  float scaledPhase = phase * 50.0;
  float distToEdge = min(fract(scaledPhase), 1.0 - fract(scaledPhase));
  float contour = 1.0 - smoothstep(0.0, fwidth(scaledPhase), distToEdge);
  return mix(color, vec3(1.0), contour * 0.65);
}

float filmGrain(vec2 fragCoord, float time) {
  const float GRAIN_FPS       = 8.0;
  const uint  TIME_MULTIPLIER = 2654435761u; // Knuth multiplicative hash
  const uint  HASH_X          = 2246822519u;
  const uint  HASH_Y          = 3266489917u;
  const uint  HASH_MIX        = 1274126177u;

  uvec2 seed = uvec2(fragCoord) ^ uvec2(uint(floor(time * GRAIN_FPS)) * TIME_MULTIPLIER);
  uint n = seed.x * HASH_X ^ seed.y * HASH_Y;
  n ^= n >> 13u; n *= HASH_MIX;
  return float(n >> 8u) / float(1u << 24u) - 0.5;
}

void main() {
  float aspectRatio = u_res.x / u_res.y;
  float time = u_time * 0.22;

  vec2 uv = toAspectUV(gl_FragCoord.xy, u_res);
  vec2 warpedUV = warpUV(uv, time);

  vec2 focalPoint1 = vec2(aspectRatio * 0.02, 0.96) + u_focalJitter1 + vec2(sin(time * 0.18) * 0.09, cos(time * 0.14) * 0.06);
  vec2 focalPoint2 = vec2(aspectRatio * 0.82, 0.08) + u_focalJitter2 + vec2(cos(time * 0.16) * 0.08, sin(time * 0.20) * 0.06);
  float dist1 = length(warpedUV - focalPoint1);
  float dist2 = length(warpedUV - focalPoint2);

  float phase = ringPhase(dist1, dist2, time);
  float focalGlow = centerProximity(dist1, dist2);
  float shimmer = fbm(warpedUV * 3.5 + vec2(time * 0.11, time * 0.08)) * 0.16;

  vec3 color = iridescentColor(phase, shimmer);
  color = applyContour(color, phase);
  color = mix(color, vec3(1.0), focalGlow * 0.82);

  float grain = filmGrain(gl_FragCoord.xy, u_time);
  fragColor = vec4(clamp(color * 0.92 + grain * 0.07, 0.0, 1.0), 1.0);
}
