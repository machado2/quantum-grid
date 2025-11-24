import { Filter } from 'pixi.js';

export function createBlackAlphaFilter(alphaBlack = 0.8, threshold = 0.02, softness = 0.01): Filter {
  const frag = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float alphaBlack;
  uniform float threshold;
  uniform float softness;
  void main() {
    vec4 c = texture2D(uSampler, vTextureCoord);
    float maxc = max(c.r, max(c.g, c.b));
    float ib = 1.0 - smoothstep(threshold, threshold + softness, maxc);
    float a = mix(c.a, alphaBlack, ib);
    gl_FragColor = vec4(c.rgb, a);
  }
  `;
  const f = new Filter(undefined, frag, { alphaBlack, threshold, softness });
  return f;
}
