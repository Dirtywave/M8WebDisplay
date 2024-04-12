#version 300 es
// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

layout(location = 0) in uint value;

const vec2 camScale = vec2(2.0 / 480.0, -2.0 / 320.0);
const vec2 camOffset = vec2(-240.0, -160.0);

void main() {
    vec2 pos = vec2(float(gl_VertexID), float(value));
    pos = (pos + vec2(0.5) + camOffset) * camScale;
    if(float(value) < 100.0) {
        gl_PointSize = 1.0;
        gl_Position = vec4(pos, 0.0, 1.0);
    } else {
        gl_Position = vec4(pos, 2.0, 1.0);
    }
}
