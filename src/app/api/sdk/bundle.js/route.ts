/**
 * SDK Bundle Endpoint
 * 
 * Serves the minified SignalsLoop JavaScript SDK.
 * This allows customers to include a single script tag on their website.
 * 
 * GET /api/sdk/bundle.js
 */

import { NextRequest, NextResponse } from 'next/server';

// Minified SDK code (inline for simplicity, in production use a build step)
const SDK_CODE = `!function(e){"use strict";const t="1.0.0",n="https://signalsloop.com/api/sdk",o="sl_vid",s="sl-hide-flicker";let r=null,i=[],a="",c=!1,l=[];function d(...e){r?.debug&&console.log("[SignalsLoop]",...e)}function u(){const e=new Uint8Array(16);return crypto.getRandomValues(e),Array.from(e,e=>e.toString(16).padStart(2,"0")).join("")}function p(){if(r?.userId)return r.userId;let e=localStorage.getItem(o);return e||(e=u(),localStorage.setItem(o,e)),e}function f(){const e=document.createElement("style");e.id="sl-flicker-styles",e.textContent="."+s+"{visibility:hidden!important}",document.head.appendChild(e),document.documentElement.classList.add(s)}function h(){document.documentElement.classList.remove(s);const e=document.getElementById("sl-flicker-styles");e&&e.remove()}function m(e){try{const t=document.querySelectorAll(e.selector);return 0===t.length?(d("No elements:",e.selector),!1):(t.forEach(t=>{const n=t;switch(e.action){case"text":n.textContent=e.value;break;case"style":e.property&&(n.style[e.property]=e.value);break;case"visibility":n.style.display="hidden"===e.value?"none":"";break;case"attribute":e.property&&n.setAttribute(e.property,e.value);break;case"class":e.value.startsWith("-")?n.classList.remove(e.value.substring(1)):e.value.startsWith("+")?n.classList.add(e.value.substring(1)):n.className=e.value}}),d("Applied:",e.selector,e.action),!0)}catch(t){return d("Error applying:",t),!1}}function g(e){const t=e.variants.find(t=>t.key===e.assignedVariant);t&&!t.isControl?(t.pageUrl&&!window.location.href.startsWith(new URL(t.pageUrl,window.location.origin).href.split("?")[0])||(d("Applying",t.changes.length,"changes"),t.changes.forEach(e=>m(e)),v(e.id,e.assignedVariant,"pageview","page_load"))):d("Control variant:",e.key)}function y(e){e.goals.forEach(t=>{if("click"===t.type&&t.selector&&document.querySelectorAll(t.selector).forEach(n=>{n.addEventListener("click",()=>{v(e.id,e.assignedVariant,"goal",t.name,void 0,{goalId:t.id})})}),d("Goal setup:",t.name),"pageview"===t.type&&t.url&&window.location.href.includes(t.url)){v(e.id,e.assignedVariant,"goal",t.name,void 0,{goalId:t.id})}})}function v(e,t,n,o,s,i){l.push({experimentId:e,variantKey:t,visitorId:a,eventType:n,eventName:o,eventValue:s,metadata:i,pageUrl:window.location.href,timestamp:Date.now()}),d("Queued:",n,o),b()}let w=null;function b(){w&&clearTimeout(w),w=setTimeout(k,1e3)}async function k(){if(0===l.length||!r)return;const e=[...l];l=[];try{const t=r.apiUrl||n;(await fetch(t+"/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({events:e,projectId:r.projectId,visitorId:a})})).ok||l.push(...e)}catch(t){d("Send error:",t),l.push(...e)}}async function x(){if(!r)return[];const e=new URL((r.apiUrl||n)+"/config");e.searchParams.set("projectId",r.projectId),e.searchParams.set("visitorId",a),e.searchParams.set("pageUrl",window.location.href);const t=await fetch(e.toString());if(!t.ok)throw new Error("HTTP "+t.status);return(await t.json()).experiments||[]}async function S(e){if(c)return void d("Already initialized");r=e,d("Init SDK v"+t),d("Project:",r.projectId),f();try{a=p(),d("Visitor:",a),i=await x(),d("Experiments:",i.length),"loading"===document.readyState&&await new Promise(e=>{document.addEventListener("DOMContentLoaded",()=>e())}),i.forEach(e=>{g(e),y(e)}),c=!0,r.onReady?.()}catch(e){d("Init error:",e),r.onError?.(e)}finally{h()}}const E={init:S,track(e,t,n){i.forEach(o=>{v(o.id,o.assignedVariant,"custom",e,t,n)})},getVariant:e=>i.find(t=>t.key===e)?.assignedVariant||null,isReady:()=>c};e.addEventListener("beforeunload",()=>{if(l.length>0&&r){const e=r.apiUrl||n;navigator.sendBeacon(e+"/events",JSON.stringify({events:l,projectId:r.projectId,visitorId:a}))}}),e.SignalsLoop=E}(window);`;

export async function GET(request: NextRequest) {
    return new NextResponse(SDK_CODE, {
        status: 200,
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
