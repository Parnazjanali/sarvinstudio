"use client";

import { GLSL_NOISE, ShaderCanvas } from "@/components/backgrounds/shader";

const FRAG = GLSL_NOISE + /* glsl */ `
uniform float u_opacity;
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 asp=vec2(u_resolution.x/u_resolution.y,1.0);
  vec2 p=uv*asp;
  float t=u_time*0.12;
  vec2 ptr=u_pointer*asp;
  vec2 toP=p-ptr;
  float pull=exp(-dot(toP,toP)*3.0);
  vec2 q=p+toP*pull*0.5;
  float n1=fbm(q*1.5+vec2(t,-t*0.6));
  float n2=fbm(q*1.5+vec2(-t*0.8,t*0.5)+3.0);
  vec3 col=mix(u_color0,u_color1,smoothstep(0.2,0.8,n1));
  col=mix(col,u_color2,smoothstep(0.3,0.9,n2)*0.8);
  float a=smoothstep(0.15,0.85,n1)*0.75+pull*0.35;
  gl_FragColor=vec4(col,a*u_opacity);
}`;

/** گرادیان سیال پرجلوه و هماهنگ با پس‌زمینه روشن سروین استودیو */
export function LiquidGradientBackground({ speed = 1, opacity = 0.75, className }: { speed?: number; opacity?: number; className?: string }) {
  return (
    <ShaderCanvas 
      fragment={FRAG} 
      colors={["#2D4F38", "#A8324E", "#E2C368"]} // سبز سرزنده‌تر، قرمز لعل شفاف‌تر و طلایی براق برای دید عالی روی بوم سفید
      uniforms={{ u_opacity: opacity }} 
      speed={speed} 
      pointer 
      className={className} 
    />
  );
}