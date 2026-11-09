import{$ as e,$t as t,B as n,Dn as r,Fn as i,H as a,In as o,L as s,Ln as c,N as l,Pn as u,Q as d,Qt as f,Sn as p,St as m,U as h,V as g,Z as _,_n as v,at as y,b,c as x,ct as S,dt as C,et as w,gn as ee,i as T,in as te,jn as E,k as ne,o as D,pt as re,r as ie,rn as ae,s as oe,tn as se,xt as ce,z as le}from"./three.core-dZ9JXGve.js";var ue=Object.defineProperty,de=(e,t)=>{let n={};for(var r in e)ue(n,r,{get:e[r],enumerable:!0});return t||ue(n,Symbol.toStringTag,{value:`Module`}),n},fe=0,pe=1,me=2,he=0,ge=1,_e=2,ve=3,ye=1.25,be=65535,xe=-65536,Se=2**-24,Ce=Symbol(`SKIP_GENERATION`),we={strategy:0,maxDepth:40,targetLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[Ce]:!1};function O(e,t,n){return n.min.x=t[e],n.min.y=t[e+1],n.min.z=t[e+2],n.max.x=t[e+3],n.max.y=t[e+4],n.max.z=t[e+5],n}function Te(e){let t=-1,n=-1/0;for(let r=0;r<3;r++){let i=e[r+3]-e[r];i>n&&(n=i,t=r)}return t}function Ee(e,t,n){for(let r=0;r<3;r++){let i=t[e+2*r],a=t[e+2*r+1],o=i-a,s=i+a;o<n[r]&&(n[r]=o),s>n[r+3]&&(n[r+3]=s)}}function De(e){let t=e[3]-e[0],n=e[4]-e[1],r=e[5]-e[2];return 2*(t*n+n*r+r*t)}function k(e,t){return t[e+15]===be}function A(e,t){return t[e+6]}function j(e,t){return t[e+14]}function M(e){return e+8}function N(e,t){return e+t[e+6]*8}function Oe(e,t){return t[e+7]}function P(e){return e}function ke(e,t,n,r,i){let a=1/0,o=1/0,s=1/0,c=-1/0,l=-1/0,u=-1/0,d=1/0,f=1/0,p=1/0,m=-1/0,h=-1/0,g=-1/0,_=e.offset||0;for(let r=(t-_)*6,i=(t+n-_)*6;r<i;r+=6){let t=e[r+0],n=e[r+1],i=t-n,_=t+n;i<a&&(a=i),_>c&&(c=_),t<d&&(d=t),t>m&&(m=t);let v=e[r+2],y=e[r+3],b=v-y,x=v+y;b<o&&(o=b),x>l&&(l=x),v<f&&(f=v),v>h&&(h=v);let S=e[r+4],C=e[r+5],w=S-C,ee=S+C;w<s&&(s=w),ee>u&&(u=ee),S<p&&(p=S),S>g&&(g=S)}r[0]=a,r[1]=o,r[2]=s,r[3]=c,r[4]=l,r[5]=u,i[0]=d,i[1]=f,i[2]=p,i[3]=m,i[4]=h,i[5]=g}var Ae=8,je=8,Me=new Int32Array(Ae),F=new Float32Array(48),Ne=new Float32Array(48),I=new Float32Array(6),Pe=new Float32Array(6),Fe=new Int32Array(je),Ie=new Float32Array(48);function Le(e,t,n,r){for(let i=0;i<3;i++){let a=t[e+2*i],o=t[e+2*i+1],s=a-o,c=a+o;s<n[r+i]&&(n[r+i]=s),c>n[r+i+3]&&(n[r+i+3]=c)}}function Re(e,t){let n=e[t+3]-e[t],r=e[t+4]-e[t+1],i=e[t+5]-e[t+2];return 2*(n*r+r*i+i*n)}function ze(e,t,n,r,i,a){let o=-1,s=0;if(a===0)o=Te(t),o!==-1&&(s=(t[o]+t[o+3])/2);else if(a===1)o=Te(e),o!==-1&&(s=Be(n,r,i,o));else if(a===2){let a=De(e),c=ye*i,l=n.offset||0,u=(r-l)*6,d=(r+i-l)*6;for(let e=0;e<3;e++){let r=t[e],l=(t[e+3]-r)/Ae;if(i<je){for(let t=0;t<i;t++){let r=u+t*6,i=n[r+2*e],a=t;for(;a>0&&n[Fe[a-1]+2*e]>i;)Fe[a]=Fe[a-1],a--;Fe[a]=r}for(let e=0;e<3;e++)I[e]=1/0,I[e+3]=-1/0,Pe[e]=1/0,Pe[e+3]=-1/0;for(let e=i-1;e>=0;e--)Ee(Fe[e],n,Pe),Ie.set(Pe,e*6);for(let t=0;t<i-1;t++){Ee(Fe[t],n,I);let r=n[Fe[t+1]+2*e];if(n[Fe[t]+2*e]===r)continue;let l=t+1,u=i-l,d=De(I)/a,f=Re(Ie,l*6)/a,p=1+ye*(d*l+f*u);p<c&&(o=e,c=p,s=r)}}else{for(let e=0;e<Ae;e++){Me[e]=0;for(let t=0;t<3;t++)F[e*6+t]=1/0,F[e*6+t+3]=-1/0}for(let t=u;t<d;t+=6){let i=~~((n[t+2*e]-r)/l);i>=Ae&&(i=7),Me[i]++,Le(t,n,F,i*6)}for(let e=0;e<6;e++)Ne[42+e]=F[42+e];for(let e=6;e>=0;e--){let t=e*6,n=t+6;for(let e=0;e<3;e++)Ne[t+e]=Math.min(F[t+e],Ne[n+e]),Ne[t+e+3]=Math.max(F[t+e+3],Ne[n+e+3])}let t=0;for(let n=0;n<7;n++){let u=n*6,d=Me[n];if(d!==0)for(let e=0;e<3;e++)t===0?(I[e]=F[u+e],I[e+3]=F[u+e+3]):(I[e]=Math.min(I[e],F[u+e]),I[e+3]=Math.max(I[e+3],F[u+e+3]));t+=d;let f=0,p=0;t!==0&&(f=De(I)/a);let m=i-t;m!==0&&(p=Re(Ne,u+6)/a);let h=1+ye*(f*t+p*m);h<c&&(o=e,c=h,s=r+l+n*l)}}}}else console.warn(`BVH: Invalid build strategy value ${a} used.`);return{axis:o,pos:s}}function Be(e,t,n,r){let i=0,a=e.offset;for(let o=t,s=t+n;o<s;o++)i+=e[(o-a)*6+r*2];return i/n}function Ve(e,t,n,r,i,a){let o=r,s=r+i-1,c=a.pos,l=a.axis*2,u=n.offset||0;for(;;){for(;o<=s&&n[(o-u)*6+l]<c;)o++;for(;o<=s&&n[(s-u)*6+l]>=c;)s--;if(o<s){for(let n=0;n<t;n++){let r=e[o*t+n];e[o*t+n]=e[s*t+n],e[s*t+n]=r}for(let e=0;e<6;e++){let t=o-u,r=s-u,i=n[t*6+e];n[t*6+e]=n[r*6+e],n[r*6+e]=i}o++,s--}else return o}}var He=2**32,Ue=new Float32Array(6),We=new Float32Array(6);function Ge(e,t,n,r,i,a){let{maxDepth:o,verbose:s,targetLeafSize:c,_strictLeafSize:l=1/0,strategy:u,onProgress:d,useSharedArrayBuffer:f=!1}=i,p=e.primitiveBuffer,m=e.primitiveBufferStride,h=new(f?SharedArrayBuffer:ArrayBuffer)(32*Math.max(1,2*Math.ceil(r)-1)),g=new Float32Array(h),_=new Uint32Array(h),v=new Uint16Array(h),y=0,b=!1;return ke(t,n,r,Ue,We),C(n,r,0),h.slice(0,y*32);function x(e){d&&d((e-a.offset)/a.count)}function S(e,t,n){let r=e*2;_[e+6]=t,v[r+14]=n,v[r+15]=be,x(t+n)}function C(e,n,r){let i=y++,a=i*8;g.set(Ue,a),!b&&r>=o&&(b=!0,s&&console.warn(`BVH: Max depth of ${o} reached when generating BVH. Consider increasing maxDepth.`));let d=n>l;if(n<=c&&!d||r>=o){S(a,e,n);return}let f=ze(Ue,We,t,e,n,u),h=f.axis===-1?-1:Ve(p,m,t,e,n,f);if(f.axis===-1||h===e||h===e+n){if(!d){S(a,e,n);return}f.axis=Math.max(0,Te(Ue)),h=e+Math.max(1,Math.floor(n/2))}_[a+7]=f.axis;let v=h-e;ke(t,e,v,Ue,We),C(e,v,r+1);let x=y-i;if(x>He)throw Error(`MeshBVH: Cannot store relative child node offset greater than 32 bits.`);_[a+6]=x;let w=n-v;ke(t,h,w,Ue,We),C(h,w,r+1)}}function Ke(e,t){let n=e.getRootRanges(t.range),r=n[0],i=n[n.length-1],a={offset:r.offset,count:i.offset+i.count-r.offset},o=new Float32Array(6*a.count);o.offset=a.offset,e.computePrimitiveBounds(a.offset,a.count,o),e._roots=n.map(n=>Ge(e,o,n.offset,n.count,t,a))}var qe=class{constructor(e){this._getNewPrimitive=e,this._primitives=[]}getPrimitive(){let e=this._primitives;return e.length===0?this._getNewPrimitive():e.pop()}releasePrimitive(e){this._primitives.push(e)}},L=new class{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;let e=[],t=null;this.setBuffer=n=>{t&&e.push(t),t=n,this.float32Array=new Float32Array(n),this.uint16Array=new Uint16Array(n),this.uint32Array=new Uint32Array(n)},this.clearBuffer=()=>{t=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,e.length!==0&&this.setBuffer(e.pop())}}},Je,Ye,Xe=[],Ze=new qe(()=>new T);function Qe(e,t,n,r,i,a){Je=Ze.getPrimitive(),Ye=Ze.getPrimitive(),Xe.push(Je,Ye),L.setBuffer(e._roots[t]);let o=$e(0,e.geometry,n,r,i,a);L.clearBuffer(),Ze.releasePrimitive(Je),Ze.releasePrimitive(Ye),Xe.pop(),Xe.pop();let s=Xe.length;return s>0&&(Ye=Xe[s-1],Je=Xe[s-2]),o}function $e(e,t,n,r,i=null,a=0,o=0){let{float32Array:s,uint16Array:c,uint32Array:l}=L,u=e*2;if(k(u,c)){let t=A(e,l),n=j(u,c);return O(P(e),s,Je),r(t,n,!1,o,a+e/8,Je)}{let u=M(e),d=N(e,l),f=u,p=d,m,h,g,_;if(i&&(g=Je,_=Ye,O(P(f),s,g),O(P(p),s,_),m=i(g),h=i(_),h<m)){f=d,p=u;let e=m;m=h,h=e,g=_}g||(g=Je,O(P(f),s,g));let v=k(f*2,c),y=n(g,v,m,o+1,a+f/8),b;if(y===2){let e=w(f);b=r(e,ee(f)-e,!0,o+1,a+f/8,g)}else b=y&&$e(f,t,n,r,i,a,o+1);if(b)return!0;_=Ye,O(P(p),s,_);let x=k(p*2,c),S=n(_,x,h,o+1,a+p/8),C;if(S===2){let e=w(p);C=r(e,ee(p)-e,!0,o+1,a+p/8,_)}else C=S&&$e(p,t,n,r,i,a,o+1);return!!C;function w(e){let{uint16Array:t,uint32Array:n}=L,r=e*2;for(;!k(r,t);)e=M(e),r=e*2;return A(e,n)}function ee(e){let{uint16Array:t,uint32Array:n}=L,r=e*2;for(;!k(r,t);)e=N(e,n),r=e*2;return A(e,n)+j(r,t)}}}var et=new L.constructor,tt=new L.constructor,R=new qe(()=>new T),nt=new T,rt=new T,it=new T,at=new T,ot=!1;function st(e,t,n,r){if(ot)throw Error(`MeshBVH: Recursive calls to bvhcast not supported.`);ot=!0;let i=e._roots,a=t._roots,o,s=0,c=0,l=new d().copy(n).invert();for(let e=0,t=i.length;e<t;e++){et.setBuffer(i[e]),c=0;let t=R.getPrimitive();O(P(0),et.float32Array,t),t.applyMatrix4(l);for(let e=0,i=a.length;e<i&&(tt.setBuffer(a[e]),o=z(0,0,n,l,r,s,c,0,0,t),tt.clearBuffer(),c+=a[e].byteLength/32,!o);e++);if(R.releasePrimitive(t),et.clearBuffer(),s+=i[e].byteLength/32,o)break}return ot=!1,o}function z(e,t,n,r,i,a=0,o=0,s=0,c=0,l=null,u=!1){let d,f;u?(d=tt,f=et):(d=et,f=tt);let p=d.float32Array,m=d.uint32Array,h=d.uint16Array,g=f.float32Array,_=f.uint32Array,v=f.uint16Array,y=e*2,b=t*2,x=k(y,h),S=k(b,v),C=!1;if(S&&x)C=u?i(A(t,_),j(t*2,v),A(e,m),j(e*2,h),c,o+t/8,s,a+e/8):i(A(e,m),j(e*2,h),A(t,_),j(t*2,v),s,a+e/8,c,o+t/8);else if(S){let l=R.getPrimitive();O(P(t),g,l),l.applyMatrix4(n);let d=M(e),f=N(e,m);O(P(d),p,nt),O(P(f),p,rt);let h=l.intersectsBox(nt),_=l.intersectsBox(rt);C=h&&z(t,d,r,n,i,o,a,c,s+1,l,!u)||_&&z(t,f,r,n,i,o,a,c,s+1,l,!u),R.releasePrimitive(l)}else{let d=M(t),f=N(t,_);O(P(d),g,it),O(P(f),g,at);let h=l.intersectsBox(it),v=l.intersectsBox(at);if(h&&v)C=z(e,d,n,r,i,a,o,s,c+1,l,u)||z(e,f,n,r,i,a,o,s,c+1,l,u);else if(h){if(x)C=z(e,d,n,r,i,a,o,s,c+1,l,u);else{let t=R.getPrimitive();t.copy(it).applyMatrix4(n);let l=M(e),f=N(e,m);O(P(l),p,nt),O(P(f),p,rt);let h=t.intersectsBox(nt),g=t.intersectsBox(rt);C=h&&z(d,l,r,n,i,o,a,c,s+1,t,!u)||g&&z(d,f,r,n,i,o,a,c,s+1,t,!u),R.releasePrimitive(t)}}else if(v){if(x)C=z(e,f,n,r,i,a,o,s,c+1,l,u);else{let t=R.getPrimitive();t.copy(at).applyMatrix4(n);let l=M(e),d=N(e,m);O(P(l),p,nt),O(P(d),p,rt);let h=t.intersectsBox(nt),g=t.intersectsBox(rt);C=h&&z(f,l,r,n,i,o,a,c,s+1,t,!u)||g&&z(f,d,r,n,i,o,a,c,s+1,t,!u),R.releasePrimitive(t)}}}return C}var ct=new class{constructor(){let e=null,t=null,n=null,r=!1;this.root=null,this.buffer=null,this.uint32Array=null,this.uint16Array=null,this.setBVH=(i,a)=>{if(r)throw Error(`BVHTraversalHelper: cannot call setBVH during an active traversal.`);this.root=a,this.buffer=e=i._roots[a],this.uint16Array=n=new Uint16Array(e),this.uint32Array=t=new Uint32Array(e)},this.reset=()=>{this.root=null,this.buffer=e=null,this.uint16Array=n=null,this.uint32Array=t=null},this.getRangeStart=e=>{let r=e*2;for(;!k(r,n);)e=M(e),r=e*2;return A(e,t)},this.getRangeEnd=e=>{let r=e*2;for(;!k(r,n);)e=N(e,t),r=e*2;return A(e,t)+j(r,n)};let i=(e,r,a)=>{let o=k(r*2,n);if(!e(a,o,r)&&!o){let n=M(r),o=N(r,t);i(e,n,a+1),i(e,o,a+1)}};this.traverseBuffer=e=>{if(r)throw Error(`BVHTraversalHelper: cannot start a traversal during an active traversal.`);r=!0;try{i(e,0,0)}finally{r=!1}},this.traverse=r=>{this.traverseBuffer((i,a,o)=>{if(a){let s=o*2,c=t[o+6],l=n[s+14];return r(i,a,new Float32Array(e,o*4,6),c,l)}{let n=Oe(o,t);return r(i,a,new Float32Array(e,o*4,6),n)}})}}},lt=new T,ut=new Float32Array(6),dt=class{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(e){e={...we,...e},`maxLeafSize`in e&&(console.warn(`BVH: "maxLeafSize" option has been deprecated. Use "targetLeafSize", instead.`),e={...e,targetLeafSize:e.maxLeafSize}),Ke(this,e)}getRootRanges(){throw Error(`BVH: getRootRanges() not implemented`)}writePrimitiveBounds(){throw Error(`BVH: writePrimitiveBounds() not implemented`)}writePrimitiveRangeBounds(e,t,n,r){let i=1/0,a=1/0,o=1/0,s=-1/0,c=-1/0,l=-1/0;for(let n=e,r=e+t;n<r;n++){this.writePrimitiveBounds(n,ut,0);let[e,t,r,u,d,f]=ut;e<i&&(i=e),u>s&&(s=u),t<a&&(a=t),d>c&&(c=d),r<o&&(o=r),f>l&&(l=f)}return n[r+0]=i,n[r+1]=a,n[r+2]=o,n[r+3]=s,n[r+4]=c,n[r+5]=l,n}computePrimitiveBounds(e,t,n){let r=n.offset||0;for(let i=e,a=e+t;i<a;i++){this.writePrimitiveBounds(i,ut,0);let[e,t,a,o,s,c]=ut,l=(e+o)/2,u=(t+s)/2,d=(a+c)/2,f=(o-e)/2,p=(s-t)/2,m=(c-a)/2,h=(i-r)*6;n[h+0]=l,n[h+1]=f+(Math.abs(l)+f)*Se,n[h+2]=u,n[h+3]=p+(Math.abs(u)+p)*Se,n[h+4]=d,n[h+5]=m+(Math.abs(d)+m)*Se}return n}shiftPrimitiveOffsets(e){let t=this._indirectBuffer;if(t)for(let n=0,r=t.length;n<r;n++)t[n]+=e;else{let t=this._roots;for(let n=0;n<t.length;n++){let r=t[n],i=new Uint32Array(r),a=new Uint16Array(r),o=r.byteLength/32;for(let t=0;t<o;t++){let n=8*t;k(2*n,a)&&(i[n+6]+=e)}}}}traverse(e,t=0){ct.setBVH(this,t),ct.traverse(e),ct.reset()}refit(){let e=this._roots;for(let t=0,n=e.length;t<n;t++){let n=e[t],r=new Uint32Array(n),i=new Uint16Array(n),a=new Float32Array(n),o=n.byteLength/32;for(let e=o-1;e>=0;e--){let t=e*8,n=t*2;if(k(n,i)){let e=A(t,r),o=j(n,i);this.writePrimitiveRangeBounds(e,o,ut,0),a.set(ut,t)}else{let e=M(t),n=N(t,r);for(let r=0;r<3;r++){let i=a[e+r],o=a[e+r+3],s=a[n+r],c=a[n+r+3];a[t+r]=i<s?i:s,a[t+r+3]=o>c?o:c}}}}}getBoundingBox(e){return e.makeEmpty(),this._roots.forEach(t=>{O(0,new Float32Array(t),lt),e.union(lt)}),e}shapecast(e){let{boundsTraverseOrder:t,intersectsBounds:n,intersectsRange:r,intersectsPrimitive:i,scratchPrimitive:a,iterate:o}=e;if(r&&i){let e=r;r=(t,n,r,s,c)=>e(t,n,r,s,c)?!0:o(t,n,this,i,r,s,a)}else r||=i?(e,t,n,r)=>o(e,t,this,i,n,r,a):(e,t,n)=>n;let s=!1,c=0,l=this._roots;for(let e=0,i=l.length;e<i;e++){let i=l[e];if(s=Qe(this,e,n,r,t,c),s)break;c+=i.byteLength/32}return s}bvhcast(e,t,n){let{intersectsRanges:r}=n;return st(this,e,t,r)}};function ft(){return typeof SharedArrayBuffer<`u`}function pt(e){return e.index?e.index.count:e.attributes.position.count}function mt(e){return pt(e)/3}function ht(e,t=ArrayBuffer){return e>65535?new Uint32Array(new t(4*e)):new Uint16Array(new t(2*e))}function gt(e,t){if(!e.index){let n=e.attributes.position.count,r=ht(n,t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer);e.setIndex(new D(r,1));for(let e=0;e<n;e++)r[e]=e}}function _t(e,t,n){let r=pt(e)/n,i=t||e.drawRange,a=i.start/n,o=(i.start+i.count)/n,s=Math.max(0,a),c=Math.min(r,o)-s;return{offset:Math.floor(s),count:Math.floor(c)}}function vt(e,t){return e.groups.map(e=>({offset:e.start/t,count:e.count/t}))}function yt(e,t,n){let r=_t(e,t,n),i=vt(e,n);if(!i.length)return[r];let a=[],o=r.offset,s=r.offset+r.count,c=pt(e)/n,l=[];for(let e of i){let{offset:t,count:n}=e,r=t,i=t+(isFinite(n)?n:c-t);r<s&&i>o&&(l.push({pos:Math.max(o,r),isStart:!0}),l.push({pos:Math.min(s,i),isStart:!1}))}l.sort((e,t)=>e.pos===t.pos?e.type===`end`?-1:1:e.pos-t.pos);let u=0,d=null;for(let e of l){let t=e.pos;u!==0&&t!==d&&a.push({offset:d,count:t-d}),u+=e.isStart?1:-1,d=t}return a}function bt(e,t){let n=e[e.length-1],r=n.offset+n.count>2**16,i=e.reduce((e,t)=>e+t.count,0),a=r?4:2,o=t?new SharedArrayBuffer(i*a):new ArrayBuffer(i*a),s=r?new Uint32Array(o):new Uint16Array(o),c=0;for(let t=0;t<e.length;t++){let{offset:n,count:r}=e[t];for(let e=0;e<r;e++)s[c+e]=n+e;c+=r}return s}var xt=class extends dt{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(e){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(e){}constructor(e,t={}){if(!e.isBufferGeometry)throw Error(`BVH: Only BufferGeometries are supported.`);if(e.index&&e.index.isInterleavedBufferAttribute)throw Error(`BVH: InterleavedBufferAttribute is not supported for the index attribute.`);if(t.useSharedArrayBuffer&&!ft())throw Error(`BVH: SharedArrayBuffer is not available.`);super(),this.geometry=e,this.resolvePrimitiveIndex=t.indirect?e=>this._indirectBuffer[e]:e=>e,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,t={...we,...t},t[Ce]||this.init(t)}init(e){let{geometry:t,primitiveStride:n}=this;if(e.indirect){let r=bt(yt(t,e.range,n),e.useSharedArrayBuffer);this._indirectBuffer=r}else gt(t,e);super.init(e),!t.boundingBox&&e.setBoundingBox&&(t.boundingBox=this.getBoundingBox(new T))}getRootRanges(e){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:yt(this.geometry,e,this.primitiveStride)}raycastObject3D(){throw Error(`BVH: raycastObject3D() not implemented`)}},B=class{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(e,t){let n=1/0,r=-1/0;for(let i=0,a=e.length;i<a;i++){let a=e[i][t];n=a<n?a:n,r=a>r?a:r}this.min=n,this.max=r}setFromPoints(e,t){let n=1/0,r=-1/0;for(let i=0,a=t.length;i<a;i++){let a=t[i],o=e.dot(a);n=o<n?o:n,r=o>r?o:r}this.min=n,this.max=r}isSeparated(e){return this.min>e.max||e.min>this.max}};B.prototype.setFromBox=(function(){let e=new o;return function(t,n){let r=n.min,i=n.max,a=1/0,o=-1/0;for(let n=0;n<=1;n++)for(let s=0;s<=1;s++)for(let c=0;c<=1;c++){e.x=r.x*n+i.x*(1-n),e.y=r.y*s+i.y*(1-s),e.z=r.z*c+i.z*(1-c);let l=t.dot(e);a=Math.min(l,a),o=Math.max(l,o)}this.min=a,this.max=o}})();var St=(function(){let e=new o,t=new o,n=new o;return function(r,i,a){let o=r.start,s=e,c=i.start,l=t;n.subVectors(o,c),e.subVectors(r.end,r.start),t.subVectors(i.end,i.start);let u=n.dot(l),d=l.dot(s),f=l.dot(l),p=n.dot(s),m=s.dot(s)*f-d*d,h,g;h=m===0?0:(u*d-p*f)/m,g=(u+h*d)/f,a.x=h,a.y=g}})(),Ct=(function(){let e=new i,t=new o,n=new o;return function(r,i,a,o){St(r,i,e);let s=e.x,c=e.y;if(s>=0&&s<=1&&c>=0&&c<=1)r.at(s,a),i.at(c,o);else if(s>=0&&s<=1)c<0?i.at(0,o):i.at(1,o),r.closestPointToPoint(o,!0,a);else if(c>=0&&c<=1)s<0?r.at(0,a):r.at(1,a),i.closestPointToPoint(a,!0,o);else{let e;e=s<0?r.start:r.end;let l;l=c<0?i.start:i.end;let u=t,d=n;if(r.closestPointToPoint(l,!0,t),i.closestPointToPoint(e,!0,n),u.distanceToSquared(l)<=d.distanceToSquared(e)){a.copy(u),o.copy(l);return}a.copy(e),o.copy(d);return}}})(),wt=(function(){let e=new o,t=new o,r=new C,i=new n;return function(n,a){let{radius:o,center:s}=n,{a:c,b:l,c:u}=a;if(i.start=c,i.end=l,i.closestPointToPoint(s,!0,e).distanceTo(s)<=o||(i.start=c,i.end=u,i.closestPointToPoint(s,!0,e).distanceTo(s)<=o)||(i.start=l,i.end=u,i.closestPointToPoint(s,!0,e).distanceTo(s)<=o))return!0;let d=a.getPlane(r);if(Math.abs(d.distanceToPoint(s))<=o){let e=d.projectPoint(s,t);if(a.containsPoint(e))return!0}return!1}})(),Tt=[`x`,`y`,`z`],V=1e-15,Et=V*V;function H(e){return Math.abs(e)<V}var U=class extends p{constructor(...e){super(...e),this.isExtendedTriangle=!0,this.satAxes=[,,,,].fill().map(()=>new o),this.satBounds=[,,,,].fill().map(()=>new B),this.points=[this.a,this.b,this.c],this.plane=new C,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new n,this.needsUpdate=!0}intersectsSphere(e){return wt(e,this)}update(){let e=this.a,t=this.b,n=this.c,r=this.points,i=this.satAxes,a=this.satBounds,o=i[0],s=a[0];this.getNormal(o),s.setFromPoints(o,r);let c=i[1],l=a[1];c.subVectors(e,t),l.setFromPoints(c,r);let u=i[2],d=a[2];u.subVectors(t,n),d.setFromPoints(u,r);let f=i[3],p=a[3];f.subVectors(n,e),p.setFromPoints(f,r);let m=c.length(),h=u.length(),g=f.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,m<V?h<V||g<V?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(n)):h<V?g<V?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(e)):g<V&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(n),this.degenerateSegment.end.copy(t)),this.plane.setFromNormalAndCoplanarPoint(o,e),this.needsUpdate=!1}};U.prototype.closestPointToSegment=(function(){let e=new o,t=new o,r=new n;return function(n,i=null,a=null){this.needsUpdate&&this.update();let{start:o,end:s}=n,c=this.points,l,u=1/0;if(this.plane.distanceToPoint(o)*this.plane.distanceToPoint(s)<0&&this.plane.intersectLine(n,e)!==null&&this.containsPoint(e))return i&&i.copy(e),a&&a.copy(e),0;for(let o=0;o<3;o++){let s=(o+1)%3;r.start.copy(c[o]),r.end.copy(c[s]),Ct(r,n,e,t),l=e.distanceToSquared(t),l<u&&(u=l,i&&i.copy(e),a&&a.copy(t))}return this.closestPointToPoint(o,e),l=o.distanceToSquared(e),l<u&&(u=l,i&&i.copy(e),a&&a.copy(o)),this.closestPointToPoint(s,e),l=s.distanceToSquared(e),l<u&&(u=l,i&&i.copy(e),a&&a.copy(s)),Math.sqrt(u)}})(),U.prototype.intersectsTriangle=(function(){let e=new U,t=new B,r=new B,a=new o,s=new o,c=new o,l=new o,u=new n,d=new n,f=new o,p=new i,m=new i;function h(e,n,i,o){let s=a;!e.isDegenerateIntoPoint&&!e.isDegenerateIntoSegment?s.copy(e.plane.normal):s.copy(n.plane.normal);let c=e.satBounds,u=e.satAxes;for(let i=1;i<4;i++){let a=c[i],o=u[i];if(t.setFromPoints(o,n.points),a.isSeparated(t)||(l.copy(s).cross(o),t.setFromPoints(l,e.points),r.setFromPoints(l,n.points),t.isSeparated(r)))return!1}let d=n.satBounds,f=n.satAxes;for(let i=1;i<4;i++){let a=d[i],o=f[i];if(t.setFromPoints(o,e.points),a.isSeparated(t)||(l.crossVectors(s,o),t.setFromPoints(l,e.points),r.setFromPoints(l,n.points),t.isSeparated(r)))return!1}return i&&(o||console.warn(`ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0.`),i.start.set(0,0,0),i.end.set(0,0,0)),!0}function g(e,t,n,r,i,a,o,s,c,l,u){let d=o/(o-s);l.x=r+(i-r)*d,u.start.subVectors(t,e).multiplyScalar(d).add(e),d=o/(o-c),l.y=r+(a-r)*d,u.end.subVectors(n,e).multiplyScalar(d).add(e)}function _(e,t,n,r,i,a,o,s,c,l,u){if(i>0)g(e.c,e.a,e.b,r,t,n,c,o,s,l,u);else if(a>0)g(e.b,e.a,e.c,n,t,r,s,o,c,l,u);else if(s*c>0||o!=0)g(e.a,e.b,e.c,t,n,r,o,s,c,l,u);else if(s!=0)g(e.b,e.a,e.c,n,t,r,s,o,c,l,u);else if(c!=0)g(e.c,e.a,e.b,r,t,n,c,o,s,l,u);else return!0;return!1}function v(e,t,n,r){let i=t.degenerateSegment,o=e.plane.distanceToPoint(i.start),s=e.plane.distanceToPoint(i.end);return H(o)?H(s)?h(e,t,n,r):(n&&(n.start.copy(i.start),n.end.copy(i.start)),e.containsPoint(i.start)):H(s)?(n&&(n.start.copy(i.end),n.end.copy(i.end)),e.containsPoint(i.end)):e.plane.intersectLine(i,a)!=null&&(n&&(n.start.copy(a),n.end.copy(a)),e.containsPoint(a))}function y(e,t,n){let r=t.a;return H(e.plane.distanceToPoint(r))&&e.containsPoint(r)?(n&&(n.start.copy(r),n.end.copy(r)),!0):!1}function b(e,t,n){let r=e.degenerateSegment,i=t.a;return r.closestPointToPoint(i,!0,a),i.distanceToSquared(a)<Et&&(n&&(n.start.copy(i),n.end.copy(i)),!0)}function x(e,t,n,r){if(e.isDegenerateIntoSegment){if(t.isDegenerateIntoSegment){let r=e.degenerateSegment,i=t.degenerateSegment,o=s,l=c;r.delta(o),i.delta(l);let u=a.subVectors(i.start,r.start),d=o.x*l.y-o.y*l.x;if(H(d))return!1;let f=(u.x*l.y-u.y*l.x)/d,p=-(o.x*u.y-o.y*u.x)/d;return f<0||f>1||p<0||p>1?!1:H(r.start.z+o.z*f-(i.start.z+l.z*p))?(n&&(n.start.copy(r.start).addScaledVector(o,f),n.end.copy(r.start).addScaledVector(o,f)),!0):!1}return t.isDegenerateIntoPoint?b(e,t,n):v(t,e,n,r)}if(e.isDegenerateIntoPoint)return t.isDegenerateIntoPoint?t.a.distanceToSquared(e.a)<Et&&(n&&(n.start.copy(e.a),n.end.copy(e.a)),!0):t.isDegenerateIntoSegment?b(t,e,n):y(t,e,n);if(t.isDegenerateIntoPoint)return y(e,t,n);if(t.isDegenerateIntoSegment)return v(e,t,n,r)}return function(t,n=null,r=!1){this.needsUpdate&&this.update(),t.isExtendedTriangle?t.needsUpdate&&t.update():(e.copy(t),e.update(),t=e);let i=x(this,t,n,r);if(i!==void 0)return i;let a=this.plane,o=t.plane,l=o.distanceToPoint(this.a),g=o.distanceToPoint(this.b),v=o.distanceToPoint(this.c);H(l)&&(l=0),H(g)&&(g=0),H(v)&&(v=0);let y=l*g,b=l*v;if(y>0&&b>0)return!1;let S=a.distanceToPoint(t.a),C=a.distanceToPoint(t.b),w=a.distanceToPoint(t.c);H(S)&&(S=0),H(C)&&(C=0),H(w)&&(w=0);let ee=S*C,T=S*w;if(ee>0&&T>0)return!1;s.copy(a.normal),c.copy(o.normal);let te=s.cross(c),E=0,ne=Math.abs(te.x),D=Math.abs(te.y);D>ne&&(ne=D,E=1),Math.abs(te.z)>ne&&(E=2);let re=Tt[E],ie=this.a[re],ae=this.b[re],oe=this.c[re],se=t.a[re],ce=t.b[re],le=t.c[re];if(_(this,ie,ae,oe,y,b,l,g,v,p,u)||_(t,se,ce,le,ee,T,S,C,w,m,d))return h(this,t,n,r);if(p.y<p.x){let e=p.y;p.y=p.x,p.x=e,f.copy(u.start),u.start.copy(u.end),u.end.copy(f)}if(m.y<m.x){let e=m.y;m.y=m.x,m.x=e,f.copy(d.start),d.start.copy(d.end),d.end.copy(f)}return p.y<m.x||m.y<p.x?!1:(n&&(m.x>p.x?n.start.copy(d.start):n.start.copy(u.start),m.y<p.y?n.end.copy(d.end):n.end.copy(u.end)),!0)}})(),U.prototype.distanceToPoint=(function(){let e=new o;return function(t){return this.closestPointToPoint(t,e),t.distanceTo(e)}})(),U.prototype.distanceToTriangle=(function(){let e=new o,t=new o,r=[`a`,`b`,`c`],i=new n,a=new n;return function(n,o=null,s=null){let c=o||s?i:null;if(this.intersectsTriangle(n,c,!0))return(o||s)&&(o&&c.getCenter(o),s&&c.getCenter(s)),0;let l=1/0;for(let t=0;t<3;t++){let i,a=r[t],c=n[a];this.closestPointToPoint(c,e),i=c.distanceToSquared(e),i<l&&(l=i,o&&o.copy(e),s&&s.copy(c));let u=this[a];n.closestPointToPoint(u,e),i=u.distanceToSquared(e),i<l&&(l=i,o&&o.copy(u),s&&s.copy(e))}for(let c=0;c<3;c++){let u=r[c],d=r[(c+1)%3];i.set(this[u],this[d]);for(let c=0;c<3;c++){let u=r[c],d=r[(c+1)%3];a.set(n[u],n[d]),Ct(i,a,e,t);let f=e.distanceToSquared(t);f<l&&(l=f,o&&o.copy(e),s&&s.copy(t))}}return Math.sqrt(l)}})();var W=class{constructor(e,t,n){this.isOrientedBox=!0,this.min=new o,this.max=new o,this.matrix=new d,this.invMatrix=new d,this.points=Array(8).fill().map(()=>new o),this.satAxes=[,,,].fill().map(()=>new o),this.satBounds=[,,,].fill().map(()=>new B),this.alignedSatBounds=[,,,].fill().map(()=>new B),this.needsUpdate=!1,e&&this.min.copy(e),t&&this.max.copy(t),n&&this.matrix.copy(n)}set(e,t,n){this.min.copy(e),this.max.copy(t),this.matrix.copy(n),this.needsUpdate=!0}copy(e){this.min.copy(e.min),this.max.copy(e.max),this.matrix.copy(e.matrix),this.needsUpdate=!0}};W.prototype.update=(function(){return function(){let e=this.matrix,t=this.min,n=this.max,r=this.points;for(let i=0;i<=1;i++)for(let a=0;a<=1;a++)for(let o=0;o<=1;o++){let s=r[1*i|2*a|4*o];s.x=i?n.x:t.x,s.y=a?n.y:t.y,s.z=o?n.z:t.z,s.applyMatrix4(e)}let i=this.satBounds,a=this.satAxes,o=r[0];for(let e=0;e<3;e++){let t=a[e],n=i[e],s=r[1<<e];t.subVectors(o,s),n.setFromPoints(t,r)}let s=this.alignedSatBounds;s[0].setFromPointsField(r,`x`),s[1].setFromPointsField(r,`y`),s[2].setFromPointsField(r,`z`),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})(),W.prototype.intersectsBox=(function(){let e=new B;return function(t){this.needsUpdate&&this.update();let n=t.min,r=t.max,i=this.satBounds,a=this.satAxes,o=this.alignedSatBounds;if(e.min=n.x,e.max=r.x,o[0].isSeparated(e)||(e.min=n.y,e.max=r.y,o[1].isSeparated(e))||(e.min=n.z,e.max=r.z,o[2].isSeparated(e)))return!1;for(let n=0;n<3;n++){let r=a[n],o=i[n];if(e.setFromBox(r,t),o.isSeparated(e))return!1}return!0}})(),W.prototype.intersectsTriangle=(function(){let e=new U,t=[,,,],n=new B,r=new B,i=new o;return function(a){this.needsUpdate&&this.update(),a.isExtendedTriangle?a.needsUpdate&&a.update():(e.copy(a),e.update(),a=e);let o=this.satBounds,s=this.satAxes;t[0]=a.a,t[1]=a.b,t[2]=a.c;for(let e=0;e<3;e++){let r=o[e],i=s[e];if(n.setFromPoints(i,t),r.isSeparated(n))return!1}let c=a.satBounds,l=a.satAxes,u=this.points;for(let e=0;e<3;e++){let t=c[e],r=l[e];if(n.setFromPoints(r,u),t.isSeparated(n))return!1}for(let e=0;e<3;e++){let a=s[e];for(let e=0;e<4;e++){let o=l[e];if(i.crossVectors(a,o),n.setFromPoints(i,t),r.setFromPoints(i,u),n.isSeparated(r))return!1}}return!0}})(),W.prototype.closestPointToPoint=(function(){return function(e,t){return this.needsUpdate&&this.update(),t.copy(e).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),t}})(),W.prototype.distanceToPoint=(function(){let e=new o;return function(t){return this.closestPointToPoint(t,e),t.distanceTo(e)}})(),W.prototype.distanceToBox=(function(){let e=[`x`,`y`,`z`],t=Array(12).fill().map(()=>new n),r=Array(12).fill().map(()=>new n),i=new o,a=new o;return function(n,o=0,s=null,c=null){if(this.needsUpdate&&this.update(),this.intersectsBox(n))return(s||c)&&(n.getCenter(a),this.closestPointToPoint(a,i),n.closestPointToPoint(i,a),s&&s.copy(i),c&&c.copy(a)),0;let l=o*o,u=n.min,d=n.max,f=this.points,p=1/0;for(let e=0;e<8;e++){let t=f[e];a.copy(t).clamp(u,d);let n=t.distanceToSquared(a);if(n<p&&(p=n,s&&s.copy(t),c&&c.copy(a),n<l))return Math.sqrt(n)}let m=0;for(let n=0;n<3;n++)for(let i=0;i<=1;i++)for(let a=0;a<=1;a++){let o=(n+1)%3,s=(n+2)%3,c=i<<o|a<<s,l=1<<n|i<<o|a<<s,p=f[c],h=f[l];t[m].set(p,h);let g=e[n],_=e[o],v=e[s],y=r[m],b=y.start,x=y.end;b[g]=u[g],b[_]=i?u[_]:d[_],b[v]=a?u[v]:d[v],x[g]=d[g],x[_]=i?u[_]:d[_],x[v]=a?u[v]:d[v],m++}for(let e=0;e<=1;e++)for(let t=0;t<=1;t++)for(let n=0;n<=1;n++){a.x=e?d.x:u.x,a.y=t?d.y:u.y,a.z=n?d.z:u.z,this.closestPointToPoint(a,i);let r=a.distanceToSquared(i);if(r<p&&(p=r,s&&s.copy(i),c&&c.copy(a),r<l))return Math.sqrt(r)}for(let e=0;e<12;e++){let n=t[e];for(let e=0;e<12;e++){let t=r[e];Ct(n,t,i,a);let o=i.distanceToSquared(a);if(o<p&&(p=o,s&&s.copy(i),c&&c.copy(a),o<l))return Math.sqrt(o)}}return Math.sqrt(p)}})();var G=new class extends qe{constructor(){super(()=>new U)}},Dt=new o,Ot=new o;function kt(e,t,n={},r=0,i=1/0){let a=r*r,o=i*i,s=1/0,c=null;if(e.shapecast({boundsTraverseOrder:e=>(Dt.copy(t).clamp(e.min,e.max),Dt.distanceToSquared(t)),intersectsBounds:(e,t,n)=>n<s&&n<o,intersectsTriangle:(e,n)=>{e.closestPointToPoint(t,Dt);let r=t.distanceToSquared(Dt);return r<s&&(Ot.copy(Dt),s=r,c=n),r<a}}),s===1/0)return null;let l=Math.sqrt(s);return n.point?n.point.copy(Ot):n.point=Ot.clone(),n.distance=l,n.faceIndex=c,n}var At=!0,jt=new o,Mt=new o,Nt=new o,Pt=new i,Ft=new i,It=new i,Lt=new o,Rt=new o,zt=new o,Bt=new o;function Vt(e,t,n,r,i,a,o,s){let c;if(c=a===1?e.intersectTriangle(r,n,t,!0,i):e.intersectTriangle(t,n,r,a!==2,i),c===null)return null;let l=e.origin.distanceTo(i);return l<o||l>s?null:{distance:l,point:i.clone()}}function Ht(e,t,n,r,a,s,c,l,u,d,f){jt.fromBufferAttribute(t,s),Mt.fromBufferAttribute(t,c),Nt.fromBufferAttribute(t,l);let m=Vt(e,jt,Mt,Nt,Bt,u,d,f);if(m){if(r){Pt.fromBufferAttribute(r,s),Ft.fromBufferAttribute(r,c),It.fromBufferAttribute(r,l),m.uv=new i;let e=p.getInterpolation(Bt,jt,Mt,Nt,Pt,Ft,It,m.uv);At||(m.uv=e)}if(a){Pt.fromBufferAttribute(a,s),Ft.fromBufferAttribute(a,c),It.fromBufferAttribute(a,l),m.uv1=new i;let e=p.getInterpolation(Bt,jt,Mt,Nt,Pt,Ft,It,m.uv1);At||(m.uv1=e)}if(n){Lt.fromBufferAttribute(n,s),Rt.fromBufferAttribute(n,c),zt.fromBufferAttribute(n,l),m.normal=new o;let t=p.getInterpolation(Bt,jt,Mt,Nt,Lt,Rt,zt,m.normal);m.normal.dot(e.direction)>0&&m.normal.multiplyScalar(-1),At||(m.normal=t)}let t={a:s,b:c,c:l,normal:new o,materialIndex:0};if(p.getNormal(jt,Mt,Nt,t.normal),m.face=t,m.faceIndex=s,At){let e=new o;p.getBarycoord(Bt,jt,Mt,Nt,e),m.barycoord=e}}return m}function Ut(e){return e&&e.isMaterial?e.side:e}function Wt(e,t,n,r,i,a,o){let s=r*3,c=s+0,l=s+1,u=s+2,{index:d,groups:f}=e;e.index&&(c=d.getX(c),l=d.getX(l),u=d.getX(u));let{position:p,normal:m,uv:h,uv1:g}=e.attributes;if(Array.isArray(t)){let e=r*3;for(let s=0,d=f.length;s<d;s++){let{start:d,count:_,materialIndex:v}=f[s];if(e>=d&&e<d+_){let e=Ut(t[v]),s=Ht(n,p,m,h,g,c,l,u,e,a,o);if(s){if(s.faceIndex=r,s.face.materialIndex=v,i)i.push(s);else return s}}}}else{let e=Ut(t),s=Ht(n,p,m,h,g,c,l,u,e,a,o);if(s){if(s.faceIndex=r,s.face.materialIndex=0,i)i.push(s);else return s}}return null}function K(e,t,n,r){let i=e.a,a=e.b,o=e.c,s=t,c=t+1,l=t+2;n&&(s=n.getX(s),c=n.getX(c),l=n.getX(l)),i.x=r.getX(s),i.y=r.getY(s),i.z=r.getZ(s),a.x=r.getX(c),a.y=r.getY(c),a.z=r.getZ(c),o.x=r.getX(l),o.y=r.getY(l),o.z=r.getZ(l)}var Gt=new o,Kt=new o,qt=new o,Jt=new i,Yt=new i,Xt=new i;function Zt(e,t,n,r){let a=t.getIndex().array,s=t.getAttribute(`position`),c=t.getAttribute(`uv`),l=a[n*3],u=a[n*3+1],d=a[n*3+2];Gt.fromBufferAttribute(s,l),Kt.fromBufferAttribute(s,u),qt.fromBufferAttribute(s,d);let f=0,m=t.groups,h=n*3;for(let e=0,t=m.length;e<t;e++){let t=m[e],{start:n,count:r}=t;if(h>=n&&h<n+r){f=t.materialIndex;break}}let g=r&&r.barycoord?r.barycoord:new o;p.getBarycoord(e,Gt,Kt,qt,g);let _=null;return c&&(Jt.fromBufferAttribute(c,l),Yt.fromBufferAttribute(c,u),Xt.fromBufferAttribute(c,d),_=r&&r.uv?r.uv:new i,p.getInterpolation(e,Gt,Kt,qt,Jt,Yt,Xt,_)),r?(r.face||={},r.face.a=l,r.face.b=u,r.face.c=d,r.face.materialIndex=f,r.face.normal||(r.face.normal=new o),p.getNormal(Gt,Kt,qt,r.face.normal),_&&(r.uv=_),r.barycoord=g,r):{face:{a:l,b:u,c:d,materialIndex:f,normal:p.getNormal(Gt,Kt,qt,new o)},uv:_,barycoord:g}}function Qt(e,t,n,r,i,a,o,s){let{geometry:c,_indirectBuffer:l}=e;for(let e=r,l=r+i;e<l;e++)Wt(c,t,n,e,a,o,s)}function $t(e,t,n,r,i,a,o){let{geometry:s,_indirectBuffer:c}=e,l=1/0,u=null;for(let e=r,c=r+i;e<c;e++){let r;r=Wt(s,t,n,e,null,a,o),r&&r.distance<l&&(u=r,l=r.distance)}return u}function en(e,t,n,r,i,a,o){let{geometry:s}=n,{index:c}=s,l=s.attributes.position;for(let n=e,s=t+e;n<s;n++){let e;if(e=n,K(o,e*3,c,l),o.needsUpdate=!0,r(o,e,i,a))return!0}return!1}function tn(e,t=null){t&&Array.isArray(t)&&(t=new Set(t));let n=e.geometry,r=n.index?n.index.array:null,i=n.attributes.position,a,o,s,c,l=0,u=e._roots;for(let e=0,t=u.length;e<t;e++)a=u[e],o=new Uint32Array(a),s=new Uint16Array(a),c=new Float32Array(a),d(0,l),l+=a.byteLength;function d(e,n,a=!1){let l=e*2;if(k(l,s)){let t=A(e,o),n=j(l,s),a=1/0,u=1/0,d=1/0,f=-1/0,p=-1/0,m=-1/0;for(let e=3*t,o=3*(t+n);e<o;e++){let t=r[e],n=i.getX(t),o=i.getY(t),s=i.getZ(t);n<a&&(a=n),n>f&&(f=n),o<u&&(u=o),o>p&&(p=o),s<d&&(d=s),s>m&&(m=s)}return c[e+0]!==a||c[e+1]!==u||c[e+2]!==d||c[e+3]!==f||c[e+4]!==p||c[e+5]!==m?(c[e+0]=a,c[e+1]=u,c[e+2]=d,c[e+3]=f,c[e+4]=p,c[e+5]=m,!0):!1}{let r=M(e),i=N(e,o),s=a,l=!1,u=!1;if(t){if(!s){let e=r/8+n/32,a=i/8+n/32;l=t.has(e),u=t.has(a),s=!l&&!u}}else l=!0,u=!0;let f=s||l,p=s||u,m=!1;f&&(m=d(r,n,s));let h=!1;p&&(h=d(i,n,s));let g=m||h;if(g)for(let t=0;t<3;t++){let n=r+t,a=i+t,o=c[n],s=c[n+3],l=c[a],u=c[a+3];c[e+t]=o<l?o:l,c[e+t+3]=s>u?s:u}return g}}}function q(e,t,n,r,i){let a,o,s,c,l,u,d=1/n.direction.x,f=1/n.direction.y,p=1/n.direction.z,m=n.origin.x,h=n.origin.y,g=n.origin.z,_=t[e],v=t[e+3],y=t[e+1],b=t[e+3+1],x=t[e+2],S=t[e+3+2];return d>=0?(a=(_-m)*d,o=(v-m)*d):(a=(v-m)*d,o=(_-m)*d),f>=0?(s=(y-h)*f,c=(b-h)*f):(s=(b-h)*f,c=(y-h)*f),a>c||s>o||((s>a||isNaN(a))&&(a=s),(c<o||isNaN(o))&&(o=c),p>=0?(l=(x-g)*p,u=(S-g)*p):(l=(S-g)*p,u=(x-g)*p),a>u||l>o)?!1:((l>a||a!==a)&&(a=l),(u<o||o!==o)&&(o=u),a<=i&&o>=r)}function nn(e,t,n,r,i,a,o,s){let{geometry:c,_indirectBuffer:l}=e;for(let e=r,u=r+i;e<u;e++)Wt(c,t,n,l?l[e]:e,a,o,s)}function rn(e,t,n,r,i,a,o){let{geometry:s,_indirectBuffer:c}=e,l=1/0,u=null;for(let e=r,d=r+i;e<d;e++){let r;r=Wt(s,t,n,c?c[e]:e,null,a,o),r&&r.distance<l&&(u=r,l=r.distance)}return u}function an(e,t,n,r,i,a,o){let{geometry:s}=n,{index:c}=s,l=s.attributes.position;for(let s=e,u=t+e;s<u;s++){let e;if(e=n.resolveTriangleIndex(s),K(o,e*3,c,l),o.needsUpdate=!0,r(o,e,i,a))return!0}return!1}function on(e,t,n,r,i,a,o){L.setBuffer(e._roots[t]),q(0,L.float32Array,r,a,o)&&sn(0,e,n,r,i,a,o),L.clearBuffer()}function sn(e,t,n,r,i,a,o){let{float32Array:s,uint16Array:c,uint32Array:l}=L,u=e*2;if(k(u,c))Qt(t,n,r,A(e,l),j(u,c),i,a,o);else{let c=M(e);q(c,s,r,a,o)&&sn(c,t,n,r,i,a,o);let u=N(e,l);q(u,s,r,a,o)&&sn(u,t,n,r,i,a,o)}}var cn=[`x`,`y`,`z`];function ln(e,t,n,r,i,a){L.setBuffer(e._roots[t]);let o=null;return q(0,L.float32Array,r,i,a)&&(o=un(0,e,n,r,i,a)),L.clearBuffer(),o}function un(e,t,n,r,i,a){let{float32Array:o,uint16Array:s,uint32Array:c}=L,l=e*2;if(k(l,s))return $t(t,n,r,A(e,c),j(l,s),i,a);{let s=Oe(e,c),l=cn[s],u=r.direction[l]>=0,d,f;u?(d=M(e),f=N(e,c)):(d=N(e,c),f=M(e));let p=q(d,o,r,i,a)?un(d,t,n,r,i,a):null;if(p){let e=p.point[l];if(u?e<=o[f+s]:e>=o[f+s+3])return p}let m=q(f,o,r,i,a)?un(f,t,n,r,i,a):null;return p&&m?p.distance<=m.distance?p:m:p||m||null}}var dn=new T,fn=new U,pn=new U,mn=new d,hn=new W,gn=new W;function _n(e,t,n,r){L.setBuffer(e._roots[t]);let i=vn(0,e,n,r);return L.clearBuffer(),i}function vn(e,t,n,r,i=null){let{float32Array:a,uint16Array:o,uint32Array:s}=L,c=e*2;if(i===null&&(n.boundingBox||n.computeBoundingBox(),hn.set(n.boundingBox.min,n.boundingBox.max,r),i=hn),k(c,o)){let i=t.geometry,l=i.index,u=i.attributes.position,d=n.index,f=n.attributes.position,p=A(e,s),m=j(c,o);if(mn.copy(r).invert(),n.boundsTree)return O(P(e),a,gn),gn.matrix.copy(mn),gn.needsUpdate=!0,n.boundsTree.shapecast({intersectsBounds:e=>gn.intersectsBox(e),intersectsTriangle:e=>{e.a.applyMatrix4(r),e.b.applyMatrix4(r),e.c.applyMatrix4(r),e.needsUpdate=!0;for(let t=p*3,n=(m+p)*3;t<n;t+=3)if(K(pn,t,l,u),pn.needsUpdate=!0,e.intersectsTriangle(pn))return!0;return!1}});{let e=mt(n);for(let t=p*3,n=(m+p)*3;t<n;t+=3){K(fn,t,l,u),fn.a.applyMatrix4(mn),fn.b.applyMatrix4(mn),fn.c.applyMatrix4(mn),fn.needsUpdate=!0;for(let t=0,n=e*3;t<n;t+=3)if(K(pn,t,d,f),pn.needsUpdate=!0,fn.intersectsTriangle(pn))return!0}}}else{let o=M(e),c=N(e,s);return O(P(o),a,dn),!!(i.intersectsBox(dn)&&vn(o,t,n,r,i)||(O(P(c),a,dn),i.intersectsBox(dn)&&vn(c,t,n,r,i)))}}var yn=new d,bn=new W,xn=new W,Sn=new o,Cn=new o,wn=new o,Tn=new o;function En(e,t,n,r={},i={},a=0,o=1/0){t.boundingBox||t.computeBoundingBox(),bn.set(t.boundingBox.min,t.boundingBox.max,n),bn.needsUpdate=!0;let s=e.geometry,c=s.attributes.position,l=s.index,u=t.attributes.position,d=t.index,f=G.getPrimitive(),p=G.getPrimitive(),m=Sn,h=Cn,g=null,_=null;i&&(g=wn,_=Tn);let v=1/0,y=null,b=null;return yn.copy(n).invert(),xn.matrix.copy(yn),e.shapecast({boundsTraverseOrder:e=>bn.distanceToBox(e),intersectsBounds:(e,t,n)=>n<v&&n<o&&(t&&(xn.min.copy(e.min),xn.max.copy(e.max),xn.needsUpdate=!0),!0),intersectsRange:(e,r)=>{if(t.boundsTree)return t.boundsTree.shapecast({boundsTraverseOrder:e=>xn.distanceToBox(e),intersectsBounds:(e,t,n)=>n<v&&n<o,intersectsRange:(t,i)=>{for(let o=t,s=t+i;o<s;o++){K(p,3*o,d,u),p.a.applyMatrix4(n),p.b.applyMatrix4(n),p.c.applyMatrix4(n),p.needsUpdate=!0;for(let t=e,n=e+r;t<n;t++){K(f,3*t,l,c),f.needsUpdate=!0;let e=f.distanceToTriangle(p,m,g);if(e<v&&(h.copy(m),_&&_.copy(g),v=e,y=t,b=o),e<a)return!0}}}});{let i=mt(t);for(let t=0,o=i;t<o;t++){K(p,3*t,d,u),p.a.applyMatrix4(n),p.b.applyMatrix4(n),p.c.applyMatrix4(n),p.needsUpdate=!0;for(let n=e,i=e+r;n<i;n++){K(f,3*n,l,c),f.needsUpdate=!0;let e=f.distanceToTriangle(p,m,g);if(e<v&&(h.copy(m),_&&_.copy(g),v=e,y=n,b=t),e<a)return!0}}}}}),G.releasePrimitive(f),G.releasePrimitive(p),v===1/0?null:(r.point?r.point.copy(h):r.point=h.clone(),r.distance=v,r.faceIndex=y,i&&(i.point?i.point.copy(_):i.point=_.clone(),i.point.applyMatrix4(yn),h.applyMatrix4(yn),i.distance=h.sub(i.point).length(),i.faceIndex=b),r)}function Dn(e,t=null){t&&Array.isArray(t)&&(t=new Set(t));let n=e.geometry,r=n.index?n.index.array:null,i=n.attributes.position,a,o,s,c,l=0,u=e._roots;for(let e=0,t=u.length;e<t;e++)a=u[e],o=new Uint32Array(a),s=new Uint16Array(a),c=new Float32Array(a),d(0,l),l+=a.byteLength;function d(n,a,l=!1){let u=n*2;if(k(u,s)){let t=A(n,o),a=j(u,s),l=1/0,d=1/0,f=1/0,p=-1/0,m=-1/0,h=-1/0;for(let n=t,o=t+a;n<o;n++){let t=3*e.resolveTriangleIndex(n);for(let e=0;e<3;e++){let n=t+e;n=r?r[n]:n;let a=i.getX(n),o=i.getY(n),s=i.getZ(n);a<l&&(l=a),a>p&&(p=a),o<d&&(d=o),o>m&&(m=o),s<f&&(f=s),s>h&&(h=s)}}return c[n+0]!==l||c[n+1]!==d||c[n+2]!==f||c[n+3]!==p||c[n+4]!==m||c[n+5]!==h?(c[n+0]=l,c[n+1]=d,c[n+2]=f,c[n+3]=p,c[n+4]=m,c[n+5]=h,!0):!1}{let e=M(n),r=N(n,o),i=l,s=!1,u=!1;if(t){if(!i){let n=e/8+a/32,o=r/8+a/32;s=t.has(n),u=t.has(o),i=!s&&!u}}else s=!0,u=!0;let f=i||s,p=i||u,m=!1;f&&(m=d(e,a,i));let h=!1;p&&(h=d(r,a,i));let g=m||h;if(g)for(let t=0;t<3;t++){let i=e+t,a=r+t,o=c[i],s=c[i+3],l=c[a],u=c[a+3];c[n+t]=o<l?o:l,c[n+t+3]=s>u?s:u}return g}}}function On(e,t,n,r,i,a,o){L.setBuffer(e._roots[t]),q(0,L.float32Array,r,a,o)&&kn(0,e,n,r,i,a,o),L.clearBuffer()}function kn(e,t,n,r,i,a,o){let{float32Array:s,uint16Array:c,uint32Array:l}=L,u=e*2;if(k(u,c))nn(t,n,r,A(e,l),j(u,c),i,a,o);else{let c=M(e);q(c,s,r,a,o)&&kn(c,t,n,r,i,a,o);let u=N(e,l);q(u,s,r,a,o)&&kn(u,t,n,r,i,a,o)}}var An=[`x`,`y`,`z`];function jn(e,t,n,r,i,a){L.setBuffer(e._roots[t]);let o=null;return q(0,L.float32Array,r,i,a)&&(o=Mn(0,e,n,r,i,a)),L.clearBuffer(),o}function Mn(e,t,n,r,i,a){let{float32Array:o,uint16Array:s,uint32Array:c}=L,l=e*2;if(k(l,s))return rn(t,n,r,A(e,c),j(l,s),i,a);{let s=Oe(e,c),l=An[s],u=r.direction[l]>=0,d,f;u?(d=M(e),f=N(e,c)):(d=N(e,c),f=M(e));let p=q(d,o,r,i,a)?Mn(d,t,n,r,i,a):null;if(p){let e=p.point[l];if(u?e<=o[f+s]:e>=o[f+s+3])return p}let m=q(f,o,r,i,a)?Mn(f,t,n,r,i,a):null;return p&&m?p.distance<=m.distance?p:m:p||m||null}}var Nn=new T,Pn=new U,Fn=new U,In=new d,Ln=new W,Rn=new W;function zn(e,t,n,r){L.setBuffer(e._roots[t]);let i=Bn(0,e,n,r);return L.clearBuffer(),i}function Bn(e,t,n,r,i=null){let{float32Array:a,uint16Array:o,uint32Array:s}=L,c=e*2;if(i===null&&(n.boundingBox||n.computeBoundingBox(),Ln.set(n.boundingBox.min,n.boundingBox.max,r),i=Ln),k(c,o)){let i=t.geometry,l=i.index,u=i.attributes.position,d=n.index,f=n.attributes.position,p=A(e,s),m=j(c,o);if(In.copy(r).invert(),n.boundsTree)return O(P(e),a,Rn),Rn.matrix.copy(In),Rn.needsUpdate=!0,n.boundsTree.shapecast({intersectsBounds:e=>Rn.intersectsBox(e),intersectsTriangle:e=>{e.a.applyMatrix4(r),e.b.applyMatrix4(r),e.c.applyMatrix4(r),e.needsUpdate=!0;for(let n=p,r=m+p;n<r;n++)if(K(Fn,3*t.resolveTriangleIndex(n),l,u),Fn.needsUpdate=!0,e.intersectsTriangle(Fn))return!0;return!1}});{let e=mt(n);for(let n=p,r=m+p;n<r;n++){K(Pn,3*t.resolveTriangleIndex(n),l,u),Pn.a.applyMatrix4(In),Pn.b.applyMatrix4(In),Pn.c.applyMatrix4(In),Pn.needsUpdate=!0;for(let t=0,n=e*3;t<n;t+=3)if(K(Fn,t,d,f),Fn.needsUpdate=!0,Pn.intersectsTriangle(Fn))return!0}}}else{let o=M(e),c=N(e,s);return O(P(o),a,Nn),!!(i.intersectsBox(Nn)&&Bn(o,t,n,r,i)||(O(P(c),a,Nn),i.intersectsBox(Nn)&&Bn(c,t,n,r,i)))}}var Vn=new d,Hn=new W,Un=new W,Wn=new o,Gn=new o,Kn=new o,qn=new o;function Jn(e,t,n,r={},i={},a=0,o=1/0){t.boundingBox||t.computeBoundingBox(),Hn.set(t.boundingBox.min,t.boundingBox.max,n),Hn.needsUpdate=!0;let s=e.geometry,c=s.attributes.position,l=s.index,u=t.attributes.position,d=t.index,f=G.getPrimitive(),p=G.getPrimitive(),m=Wn,h=Gn,g=null,_=null;i&&(g=Kn,_=qn);let v=1/0,y=null,b=null;return Vn.copy(n).invert(),Un.matrix.copy(Vn),e.shapecast({boundsTraverseOrder:e=>Hn.distanceToBox(e),intersectsBounds:(e,t,n)=>n<v&&n<o&&(t&&(Un.min.copy(e.min),Un.max.copy(e.max),Un.needsUpdate=!0),!0),intersectsRange:(r,i)=>{if(t.boundsTree){let s=t.boundsTree;return s.shapecast({boundsTraverseOrder:e=>Un.distanceToBox(e),intersectsBounds:(e,t,n)=>n<v&&n<o,intersectsRange:(t,o)=>{for(let x=t,S=t+o;x<S;x++){let t=s.resolveTriangleIndex(x);K(p,3*t,d,u),p.a.applyMatrix4(n),p.b.applyMatrix4(n),p.c.applyMatrix4(n),p.needsUpdate=!0;for(let t=r,n=r+i;t<n;t++){let n=e.resolveTriangleIndex(t);K(f,3*n,l,c),f.needsUpdate=!0;let r=f.distanceToTriangle(p,m,g);if(r<v&&(h.copy(m),_&&_.copy(g),v=r,y=t,b=x),r<a)return!0}}}})}{let o=mt(t);for(let t=0,s=o;t<s;t++){K(p,3*t,d,u),p.a.applyMatrix4(n),p.b.applyMatrix4(n),p.c.applyMatrix4(n),p.needsUpdate=!0;for(let n=r,o=r+i;n<o;n++){let r=e.resolveTriangleIndex(n);K(f,3*r,l,c),f.needsUpdate=!0;let i=f.distanceToTriangle(p,m,g);if(i<v&&(h.copy(m),_&&_.copy(g),v=i,y=n,b=t),i<a)return!0}}}}}),G.releasePrimitive(f),G.releasePrimitive(p),v===1/0?null:(r.point?r.point.copy(h):r.point=h.clone(),r.distance=v,r.faceIndex=y,i&&(i.point?i.point.copy(_):i.point=_.clone(),i.point.applyMatrix4(Vn),h.applyMatrix4(Vn),i.distance=h.sub(i.point).length(),i.faceIndex=b),r)}function Yn(e,t,n){return e===null?null:(e.point.applyMatrix4(t.matrixWorld),e.distance=e.point.distanceTo(n.ray.origin),e.object=t,e)}var Xn=new W,Zn=new se,Qn=new o,$n=new d,er=new o,tr=[`getX`,`getY`,`getZ`],nr=class e extends xt{static serialize(e,t={}){t={cloneBuffers:!0,...t};let n=e.geometry,r=e._roots,i=e._indirectBuffer,a=n.getIndex(),o={version:1,roots:null,index:null,indirectBuffer:null};return t.cloneBuffers?(o.roots=r.map(e=>e.slice()),o.index=a?a.array.slice():null,o.indirectBuffer=i?i.slice():null):(o.roots=r,o.index=a?a.array:null,o.indirectBuffer=i),o}static deserialize(t,n,r={}){r={setIndex:!0,indirect:!!t.indirectBuffer,...r};let{index:i,roots:a,indirectBuffer:o}=t;t.version||(console.warn(`MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data.`),c(a));let s=new e(n,{...r,[Ce]:!0});if(s._roots=a,s._indirectBuffer=o||null,r.setIndex){let e=n.getIndex();if(e===null){let e=new D(t.index,1,!1);n.setIndex(e)}else e.array!==i&&(e.array.set(i),e.needsUpdate=!0)}return s;function c(e){for(let t=0;t<e.length;t++){let n=e[t],r=new Uint32Array(n),i=new Uint16Array(n);for(let e=0,t=n.byteLength/32;e<t;e++){let t=8*e;k(2*t,i)||(r[t+6]=r[t+6]/8-e)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(e,t={}){t.maxLeafTris&&(console.warn(`MeshBVH: "maxLeafTris" option has been deprecated. Use "targetLeafSize", instead.`),t={...t,targetLeafSize:t.maxLeafTris}),super(e,t)}shiftTriangleOffsets(e){return super.shiftPrimitiveOffsets(e)}writePrimitiveBounds(e,t,n){let r=this.geometry,i=this._indirectBuffer,a=r.attributes.position,o=r.index?r.index.array:null,s=(i?i[e]:e)*3,c=s+0,l=s+1,u=s+2;o&&(c=o[c],l=o[l],u=o[u]);for(let e=0;e<3;e++){let r=a[tr[e]](c),i=a[tr[e]](l),o=a[tr[e]](u),s=r;i<s&&(s=i),o<s&&(s=o);let d=r;i>d&&(d=i),o>d&&(d=o),t[n+e]=s,t[n+e+3]=d}return t}computePrimitiveBounds(e,t,n){let r=this.geometry,i=this._indirectBuffer,a=r.attributes.position,o=r.index?r.index.array:null,s=a.normalized;if(e<0||t+e-n.offset>n.length/6)throw Error(`MeshBVH: compute triangle bounds range is invalid.`);let c=a.array,l=a.offset||0,u=3;a.isInterleavedBufferAttribute&&(u=a.data.stride);let d=[`getX`,`getY`,`getZ`],f=n.offset;for(let r=e,p=e+t;r<p;r++){let e=(i?i[r]:r)*3,t=(r-f)*6,p=e+0,m=e+1,h=e+2;o&&(p=o[p],m=o[m],h=o[h]),s||(p=p*u+l,m=m*u+l,h=h*u+l);for(let e=0;e<3;e++){let r,i,o;s?(r=a[d[e]](p),i=a[d[e]](m),o=a[d[e]](h)):(r=c[p+e],i=c[m+e],o=c[h+e]);let l=r;i<l&&(l=i),o<l&&(l=o);let u=r;i>u&&(u=i),o>u&&(u=o);let f=(u-l)/2,g=e*2;n[t+g+0]=l+f,n[t+g+1]=f+(Math.abs(l)+f)*Se}}return n}raycastObject3D(e,t,n=[]){let{material:r}=e;if(r===void 0)return;$n.copy(e.matrixWorld).invert(),Zn.copy(t.ray).applyMatrix4($n),er.setFromMatrixScale(e.matrixWorld),Qn.copy(Zn.direction).multiply(er);let i=Qn.length(),a=t.near/i,o=t.far/i;if(t.firstHitOnly===!0){let i=this.raycastFirst(Zn,r,a,o);i=Yn(i,e,t),i&&n.push(i)}else{let i=this.raycast(Zn,r,a,o);for(let r=0,a=i.length;r<a;r++){let a=Yn(i[r],e,t);a&&n.push(a)}}return n}refit(e=null){return(this.indirect?Dn:tn)(this,e)}raycast(e,t=0,n=0,r=1/0){let i=this._roots,a=[],o=this.indirect?On:on;for(let s=0,c=i.length;s<c;s++)o(this,s,t,e,a,n,r);return a}raycastFirst(e,t=0,n=0,r=1/0){let i=this._roots,a=null,o=this.indirect?jn:ln;for(let s=0,c=i.length;s<c;s++){let i=o(this,s,t,e,n,r);i!=null&&(a==null||i.distance<a.distance)&&(a=i)}return a}intersectsGeometry(e,t){let n=!1,r=this._roots,i=this.indirect?zn:_n;for(let a=0,o=r.length;a<o&&(n=i(this,a,e,t),!n);a++);return n}shapecast(e){let t=G.getPrimitive(),n=super.shapecast({...e,intersectsPrimitive:e.intersectsTriangle,scratchPrimitive:t,iterate:this.indirect?an:en});return G.releasePrimitive(t),n}bvhcast(t,n,r){let{intersectsRanges:i,intersectsTriangles:a}=r,o=G.getPrimitive(),s=this.geometry.index,c=this.geometry.attributes.position,l=this.indirect?e=>{let t=this.resolveTriangleIndex(e);K(o,t*3,s,c)}:e=>{K(o,e*3,s,c)},u=G.getPrimitive(),d=t.geometry.index,f=t.geometry.attributes.position,p=t.indirect?e=>{let n=t.resolveTriangleIndex(e);K(u,n*3,d,f)}:e=>{K(u,e*3,d,f)};if(a){if(!(t instanceof e))throw Error(`MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.`);let r=(e,t,r,i,s,c,d,f)=>{for(let m=r,h=r+i;m<h;m++){p(m),u.a.applyMatrix4(n),u.b.applyMatrix4(n),u.c.applyMatrix4(n),u.needsUpdate=!0;for(let n=e,r=e+t;n<r;n++)if(l(n),o.needsUpdate=!0,a(o,u,n,m,s,c,d,f))return!0}return!1};if(i){let e=i;i=function(t,n,i,a,o,s,c,l){return e(t,n,i,a,o,s,c,l)?!0:r(t,n,i,a,o,s,c,l)}}else i=r}return super.bvhcast(t,n,{intersectsRanges:i})}intersectsBox(e,t){return Xn.set(e.min,e.max,t),Xn.needsUpdate=!0,this.shapecast({intersectsBounds:e=>Xn.intersectsBox(e),intersectsTriangle:e=>Xn.intersectsTriangle(e)})}intersectsSphere(e){return this.shapecast({intersectsBounds:t=>e.intersectsBox(t),intersectsTriangle:t=>t.intersectsSphere(e)})}closestPointToGeometry(e,t,n={},r={},i=0,a=1/0){return(this.indirect?Jn:En)(this,e,t,n,r,i,a)}closestPointToPoint(e,t={},n=0,r=1/0){return kt(this,e,t,n,r)}},rr=new d,ir=new se,ar=new qe(()=>new n),or=new o,sr=new o,cr=new T,lr=new o,ur=[`getX`,`getY`,`getZ`],dr=class extends xt{get primitiveStride(){return 2}writePrimitiveBounds(e,t,n){let r=this._indirectBuffer,{geometry:i,primitiveStride:a}=this,o=i.attributes.position,s=i.index,c=s?s.count:o.count,l=(r?r[e]:e)*a,u=(l+1)%c;s&&(l=s.getX(l),u=s.getX(u));for(let e=0;e<3;e++){let r=o[ur[e]](l),i=o[ur[e]](u),a=r<i?r:i,s=r>i?r:i;t[n+e]=a,t[n+e+3]=s}return t}shapecast(e){let t=ar.getPrimitive(),n=super.shapecast({...e,intersectsPrimitive:e.intersectsLine,scratchPrimitive:t,iterate:mr});return ar.releasePrimitive(t),n}raycastObject3D(e,t,n=[]){let{matrixWorld:r}=e,{firstHitOnly:i}=t;rr.copy(r).invert(),ir.copy(t.ray).applyMatrix4(rr);let a=t.params.Line.threshold/((e.scale.x+e.scale.y+e.scale.z)/3),o=a*a,s=null,c=1/0;return this.shapecast({boundsTraverseOrder:e=>e.distanceToPoint(ir.origin),intersectsBounds:e=>{if(cr.copy(e).expandByScalar(a),i){if(!ir.intersectBox(cr,lr))return 0;let e;return cr.containsPoint(ir.origin)?e=0:(lr.applyMatrix4(r),e=t.ray.origin.distanceTo(lr)),+(e<c)}return+!!ir.intersectsBox(cr)},intersectsLine:(a,l)=>{if(ir.distanceSqToSegment(a.start,a.end,or,sr)>o)return;or.applyMatrix4(e.matrixWorld);let u=t.ray.origin.distanceTo(or);u<t.near||u>t.far||i&&u>=c||(c=u,l=this.resolvePrimitiveIndex(l),s={distance:u,point:sr.clone().applyMatrix4(r),index:l*this.primitiveStride,face:null,faceIndex:null,barycoord:null,object:e},i||n.push(s))}}),i&&s&&n.push(s),n}},fr=class extends dr{get primitiveStride(){return 1}constructor(e,t={}){t={...t,indirect:!0},super(e,t)}},pr=class extends fr{getRootRanges(...e){let t=super.getRootRanges(...e);return t.forEach(e=>e.count--),t}};function mr(e,t,n,r,i,a,o){let{geometry:s,primitiveStride:c}=n,{index:l}=s,u=s.attributes.position,d=l?l.count:u.count;for(let s=e,f=t+e;s<f;s++){let e=n.resolvePrimitiveIndex(s)*c,t=(e+1)%d;if(l&&(e=l.getX(e),t=l.getX(t)),o.start.fromBufferAttribute(u,e),o.end.fromBufferAttribute(u,t),r(o,s,i,a))return!0}return!1}var hr=new d,gr=new se,_r=new qe(()=>new o),vr=new T,yr=new o,br=class extends xt{get primitiveStride(){return 1}writePrimitiveBounds(e,t,n){let r=this._indirectBuffer,{geometry:i}=this,a=i.attributes.position,o=i.index,s=r?r[e]:e;o&&(s=o.getX(s));let c=a.getX(s),l=a.getY(s),u=a.getZ(s);return t[n+0]=c,t[n+1]=l,t[n+2]=u,t[n+3]=c,t[n+4]=l,t[n+5]=u,t}shapecast(e){let t=_r.getPrimitive(),n=super.shapecast({...e,intersectsPrimitive:e.intersectsPoint,scratchPrimitive:t,iterate:xr});return _r.releasePrimitive(t),n}raycastObject3D(e,t,n=[]){let{geometry:r}=this,{matrixWorld:i}=e,{firstHitOnly:a}=t;hr.copy(i).invert(),gr.copy(t.ray).applyMatrix4(hr);let s=t.params.Points.threshold/((e.scale.x+e.scale.y+e.scale.z)/3),c=s*s,l=null,u=1/0;return this.shapecast({boundsTraverseOrder:e=>e.distanceToPoint(gr.origin),intersectsBounds:e=>{if(vr.copy(e).expandByScalar(s),a){if(!gr.intersectBox(vr,yr))return 0;let e;return vr.containsPoint(gr.origin)?e=0:(yr.applyMatrix4(i),e=t.ray.origin.distanceTo(yr)),+(e<u)}return+!!gr.intersectsBox(vr)},intersectsPoint:(s,d)=>{let f=gr.distanceSqToPoint(s);if(f<c){let c=new o;gr.closestPointToPoint(s,c),c.applyMatrix4(i);let p=t.ray.origin.distanceTo(c);if(p<t.near||p>t.far||a&&p>=u)return;u=p,d=this.resolvePrimitiveIndex(d),l={distance:p,distanceToRay:Math.sqrt(f),point:c,index:r.index?r.index.getX(d):d,face:null,faceIndex:null,barycoord:null,object:e},a||n.push(l)}}}),a&&l&&n.push(l),n}};function xr(e,t,n,r,i,a,o){let{geometry:s}=n,{index:c}=s,l=s.attributes.position;for(let s=e,u=t+e;s<u;s++){let e=n.resolvePrimitiveIndex(s),t=c?c.array[e]:e;if(o.fromBufferAttribute(l,t),r(o,s,i,a))return!0}return!1}var J=new oe,Y=new d,Sr=new d,Cr=new T,wr=new v,X=new o,Tr=new se,Z=new e,Er={},Dr=class extends dt{constructor(e,t={}){t={precise:!1,includeInstances:!0,matrixWorld:Array.isArray(e)?new d:e.matrixWorld,targetLeafSize:1,...t},super();let n=new Set;Ar(e,n);let r=Array.from(n),i=Math.ceil(Math.log2(r.length)),a=(1<<i)-1;this.objects=r,this.idBits=i,this.idMask=a,this.primitiveBuffer=null,this.primitiveBufferStride=1,this.precise=t.precise,this.includeInstances=t.includeInstances,this.matrixWorld=t.matrixWorld,this.init(t)}getObjectFromId(e){let{idMask:t,objects:n}=this;return n[Or(e,t)]}getInstanceFromId(e){let{idMask:t,idBits:n}=this;return kr(e,n,t)}init(e){let{objects:t,idBits:n,matrixWorld:r}=this;Sr.copy(r).invert(),this.primitiveBuffer=new Uint32Array(this._countPrimitives(t)),this._fillPrimitiveBuffer(t,n,this.primitiveBuffer),super.init(e)}refit(...e){Sr.copy(this.matrixWorld).invert(),super.refit(...e)}writePrimitiveBounds(e,t,n){let{primitiveBuffer:r}=this;this._getPrimitiveBoundingBox(r[e],Sr,Cr);let{min:i,max:a}=Cr;t[n+0]=i.x,t[n+1]=i.y,t[n+2]=i.z,t[n+3]=a.x,t[n+4]=a.y,t[n+5]=a.z}getRootRanges(){return[{offset:0,count:this.primitiveBuffer.length}]}shapecast(e){return super.shapecast({...e,intersectsPrimitive:e.intersectsObject,scratchPrimitive:null,iterate:Mr})}raycast(e,t=[]){let{matrixWorld:n,includeInstances:r}=this,{firstHitOnly:i}=e,a=[];Sr.copy(n).invert(),Tr.copy(e.ray).applyMatrix4(Sr);let o=1/0,s=null;return this.shapecast({boundsTraverseOrder:e=>e.distanceToPoint(Tr.origin),intersectsBounds:t=>{if(i){if(!Tr.intersectBox(t,X))return 0;let r;return t.containsPoint(Tr.origin)?r=0:(X.applyMatrix4(n),r=e.ray.origin.distanceTo(X)),+(r<o)}return+!!Tr.intersectsBox(t)},intersectsObject(n,c){if(n.visible){if(a.length=0,n.isInstancedMesh&&r)Z.geometry=n.geometry,Z.material=n.material,n.getMatrixAt(c,Z.matrixWorld),Z.matrixWorld.premultiply(n.matrixWorld),Z.raycast(e,a),a.forEach(e=>{e.object=n,e.instanceId=c}),Z.material=null;else if(n.isBatchedMesh&&r){if(!n.getVisibleAt(c))return;let t=n.getGeometryIdAt(c),r=n.getGeometryRangeAt(t,Er);J.index=n.geometry.index,J.attributes=n.geometry.attributes,J.setDrawRange(r.start,r.count),Z.geometry=J,Z.material=n.material,n.getMatrixAt(c,Z.matrixWorld),Z.matrixWorld.premultiply(n.matrixWorld),Z.raycast(e,a),a.forEach(e=>{e.object=n,e.batchId=c}),Z.material=null,J.index=null,J.attributes=null,J.setDrawRange(0,1/0)}else n.raycast(e,a);i?a.forEach(e=>{e.distance<o&&(o=e.distance,s=e)}):t.push(...a)}}}),i&&s&&t.push(s),t}_getPrimitiveBoundingBox(e,t,n){let{objects:r,idMask:i,idBits:a,precise:o,includeInstances:s}=this,c=Or(e,i),l=kr(e,a,i),u=r[c];if(!s&&(u.isInstancedMesh||u.isBatchedMesh))u.boundingBox||u.computeBoundingBox(),u.boundingSphere||u.computeBoundingSphere(),Y.copy(u.matrixWorld).premultiply(t),wr.copy(u.boundingSphere).applyMatrix4(Y),n.copy(u.boundingBox).applyMatrix4(Y),Nr(n,wr);else if(o){if(u.isInstancedMesh)u.getMatrixAt(l,Y),Y.premultiply(u.matrixWorld).premultiply(t),jr(u.geometry,Y,n);else if(u.isBatchedMesh){let e=u.getGeometryIdAt(l),r=u.getGeometryRangeAt(e,Er);J.index=u.geometry.index,J.attributes=u.geometry.attributes,J.setDrawRange(r.start,r.count),u.getMatrixAt(l,Y),Y.premultiply(u.matrixWorld).premultiply(t),jr(J,Y,n),J.attributes=null}else Y.copy(u.matrixWorld).premultiply(t),n.setFromObject(u,!0).applyMatrix4(t)}else if(u.isInstancedMesh)u.geometry.boundingBox||u.geometry.computeBoundingBox(),u.geometry.boundingSphere||u.geometry.computeBoundingSphere(),u.getMatrixAt(l,Y),Y.premultiply(u.matrixWorld).premultiply(t),wr.copy(u.geometry.boundingSphere).applyMatrix4(Y),n.copy(u.geometry.boundingBox).applyMatrix4(Y),Nr(n,wr);else if(u.isBatchedMesh){let e=u.getGeometryIdAt(l);u.getMatrixAt(l,Y),Y.premultiply(u.matrixWorld).premultiply(t),u.getBoundingSphereAt(e,wr).applyMatrix4(Y),u.getBoundingBoxAt(e,n).applyMatrix4(Y),Nr(n,wr)}else n.setFromObject(u,!1).applyMatrix4(t)}_countPrimitives(e){let{includeInstances:t}=this,n=0;return e.forEach(e=>{if(e.isInstancedMesh&&t)n+=e.count;else if(e.isBatchedMesh&&t){if(!(`instanceCount`in e))throw Error(`ObjectBVH: Three.js revision >= r169 is required to use BatchedMesh.`);n+=e.instanceCount}else n++}),n}_fillPrimitiveBuffer(e,t,n){let{includeInstances:r}=this,i=0;e.forEach((e,a)=>{if(e.isInstancedMesh&&r){let r=e.count;for(let e=0;e<r;e++)n[i]=e<<t|a,i++}else if(e.isBatchedMesh&&r){let{instanceCount:r,maxInstanceCount:o}=e,s=0,c=0;for(;s<r&&c<o;){try{e.getVisibleAt(c),n[i]=c<<t|a,s++,i++}catch{}c++}}else n[i]=a,i++})}};function Or(e,t){return e&t}function kr(e,t,n){return(e&~n)>>>t}function Ar(e,t=new Set){Array.isArray(e)?e.forEach(e=>Ar(e,t)):e.traverse(e=>{(e.isMesh||e.isLine||e.isPoints)&&t.add(e)})}function jr(e,t,n){n.makeEmpty();let r=e.drawRange,i=e.index,a=e.attributes.position,o=r.start,s=i?i.count:a.count,c=Math.min(s-o,r.count);for(let e=o,r=o+c;e<r;e++){let r=e;i&&(r=i.getX(r)),X.fromBufferAttribute(a,r).applyMatrix4(t),n.expandByPoint(X)}return n}function Mr(e,t,n,r,i,a){let{primitiveBuffer:o,objects:s,idMask:c,idBits:l}=n;for(let n=e,u=t+e;n<u;n++){let e=o[n],t=Or(e,c),u=kr(e,l,c),d=s[t];if(r(d,u,i,a))return!0}return!1}function Nr(e,t){X.copy(t.center).addScalar(-t.radius),e.min.max(X),X.copy(t.center).addScalar(t.radius),e.max.min(X)}var Pr=new o,Fr=new o,Ir=new o,Q=new se,Lr=new d,Rr=new o,zr=new o,Br=[`x`,`y`,`z`],Vr=!0,Hr=new i,Ur=new i,Wr=new i,Gr=new o,Kr=new o,qr=new o,Jr=class extends xt{get primitiveStride(){return 3}constructor(e,t={}){if(!e.isMesh)throw Error(`SkinnedMeshBVH: First argument must be a Mesh.`);super(e.geometry,{...t,[Ce]:!0}),this.mesh=e,t[Ce]||this.init(t)}writePrimitiveBounds(e,t,n){let{mesh:r,geometry:i}=this,a=this._indirectBuffer,o=i.index?i.index.array:null,s=(a?a[e]:e)*3,c=s+0,l=s+1,u=s+2;o&&(c=o[c],l=o[l],u=o[u]),r.getVertexPosition(c,Pr),r.getVertexPosition(l,Fr),r.getVertexPosition(u,Ir);for(let e=0;e<3;e++){let r=Br[e],i=Pr[r],a=Fr[r],o=Ir[r],s=i;a<s&&(s=a),o<s&&(s=o);let c=i;a>c&&(c=a),o>c&&(c=o),t[n+e]=s,t[n+e+3]=c}return t}shapecast(e){let t=new U;return super.shapecast({...e,intersectsPrimitive:e.intersectsTriangle,scratchPrimitive:t,iterate:Yr})}raycastObject3D(e,t,n=[]){let{material:r}=e;if(r===void 0)return;let{matrixWorld:a}=e,{firstHitOnly:s}=t;Lr.copy(a).invert(),Q.copy(t.ray).applyMatrix4(Lr);let c=null,l=1/0;return this.shapecast({boundsTraverseOrder:e=>e.distanceToPoint(Q.origin),intersectsBounds:e=>{if(s){if(!Q.intersectBox(e,zr))return 0;let n;return e.containsPoint(Q.origin)?n=0:(zr.applyMatrix4(a),n=t.ray.origin.distanceTo(zr)),+(n<l)}return+!!Q.intersectsBox(e)},intersectsTriangle:(u,d)=>{let f=null;if(f=r.side===0?Q.intersectTriangle(u.a,u.b,u.c,!0,Rr):r.side===1?Q.intersectTriangle(u.c,u.b,u.a,!0,Rr):Q.intersectTriangle(u.a,u.b,u.c,!1,Rr),!f)return;f=f.clone().applyMatrix4(a);let m=t.ray.origin.distanceTo(f);if(m>=t.near&&m<=t.far){if(s&&m>=l)return;let{geometry:t}=this,{index:r}=t,a=this.resolvePrimitiveIndex(d),h=a*3,g=h+0,_=h+1,v=h+2;r&&(g=r.array[g],_=r.array[_],v=r.array[v]);let y={distance:m,point:f.clone(),object:e,uv:null,uv1:null,normal:null,face:{a:g,b:_,c:v,normal:p.getNormal(u.a,u.b,u.c,new o),materialIndex:0},faceIndex:a};if(Vr){let e=new o;p.getBarycoord(Rr,u.a,u.b,u.c,e),y.barycoord=e}let b=t.attributes.uv,x=t.attributes.uv1,S=t.attributes.normal;if(b){Hr.fromBufferAttribute(b,g),Ur.fromBufferAttribute(b,_),Wr.fromBufferAttribute(b,v),y.uv=new i;let e=p.getInterpolation(Rr,u.a,u.b,u.c,Hr,Ur,Wr,y.uv);Vr||(y.uv=e)}if(x){Hr.fromBufferAttribute(x,g),Ur.fromBufferAttribute(x,_),Wr.fromBufferAttribute(x,v),y.uv1=new i;let e=p.getInterpolation(Rr,u.a,u.b,u.c,Hr,Ur,Wr,y.uv1);Vr||(y.uv1=e)}if(S){Gr.fromBufferAttribute(S,g),Kr.fromBufferAttribute(S,_),qr.fromBufferAttribute(S,v),y.normal=new o;let e=p.getInterpolation(Rr,u.a,u.b,u.c,Gr,Kr,qr,y.normal);y.normal.dot(Q.direction)>0&&y.normal.multiplyScalar(-1),Vr||(y.normal=e)}l=y.distance,c=y,s||n.push(y)}}}),s&&c&&n.push(c),n}};function Yr(e,t,n,r,i,a,o){let{mesh:s,geometry:c}=n,l=c.index?c.index.array:null;for(let c=e,u=t+e;c<u;c++){let e=n.resolvePrimitiveIndex(c),t=3*e+0,u=3*e+1,d=3*e+2;if(l&&(t=l[t],u=l[u],d=l[d]),s.getVertexPosition(t,o.a),s.getVertexPosition(u,o.b),s.getVertexPosition(d,o.c),o.needsUpdate=!0,r(o,c,i,a))return!0}return!1}var Xr=new T,Zr=new d,Qr=new o,$r=class extends S{get isMesh(){return!this.displayEdges}get isLineSegments(){return this.displayEdges}get isLine(){return this.displayEdges}getVertexPosition(...t){return e.prototype.getVertexPosition.call(this,...t)}constructor(e,t,n=10,r=0){super(),this.material=t,this.geometry=new oe,this.name=`BVHRootHelper`,this.depth=n,this.displayParents=!1,this.bvh=e,this.displayEdges=!0,this._group=r}raycast(){}intersectsFrustum(e){return e.intersectsObject(this)}update(){let e=this.bvh;this.geometry.dispose(),this.visible=!1,e&&(this.geometry=this.getGeometry(e),this.visible=!0)}getGeometry(e){let t=this._group,n=null;if(t!==-1)n=this.getBVHBoundPositions(e,t);else{let t=e._roots.map((t,n)=>this.getBVHBoundPositions(e,n)),r=t.reduce((e,t)=>e+t.length,0);n=new Float32Array(r);let i=0;t.forEach(e=>{n.set(e,i),i+=e.length})}let r=this.getBVHBoundIndices(n),i=new oe;return i.setIndex(new D(r,1,!1)),i.setAttribute(`position`,new D(n,3,!1)),i}getBVHBoundIndices(e){let t=e.length/24,n,r;r=this.displayEdges?new Uint8Array([0,4,1,5,2,6,3,7,0,2,1,3,4,6,5,7,0,1,2,3,4,5,6,7]):new Uint8Array([0,1,2,2,1,3,4,6,5,6,7,5,1,4,5,0,4,1,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]),n=e.length>65535?new Uint32Array(r.length*t):new Uint16Array(r.length*t);let i=r.length;for(let e=0;e<t;e++){let t=e*8,a=e*i;for(let e=0;e<i;e++)n[a+e]=t+r[e]}return n}getBVHBoundPositions(e,t=0,n=null){let r=this.depth-1,i=this.displayParents,a=0;e.traverse((e,t,n)=>{if(O(0,n,Xr),Xr.isEmpty())return!0;if(e>=r||t)return a++,!0;i&&a++},t);let o=0,s=new Float32Array(24*a);return e.traverse((e,t,a)=>{if(O(0,a,Xr),Xr.isEmpty())return!0;let c=e>=r||t;if(c||i){let{min:e,max:t}=Xr;for(let r=-1;r<=1;r+=2){let i=r<0?e.x:t.x;for(let r=-1;r<=1;r+=2){let a=r<0?e.y:t.y;for(let r=-1;r<=1;r+=2){let c=r<0?e.z:t.z;Qr.set(i,a,c),n&&Qr.applyMatrix4(n),Qr.toArray(s,o),o+=3}}}return c}},t),s}},ei=class e extends l{get color(){return this.edgeMaterial.color}get opacity(){return this.edgeMaterial.opacity}set opacity(e){this.edgeMaterial.opacity=e,this.meshMaterial.opacity=e}get objectIndex(){return console.warn(`BVHHelper: "objectIndex" has been renamed "instanceId".`),this.instanceId}set objectIndex(e){console.warn(`BVHHelper: "objectIndex" has been renamed "instanceId".`),this.instanceId=e}constructor(e=null,t=null,n=10){e instanceof nr&&(n=t||10,t=e,e=null),typeof t==`number`&&(n=t,t=null),super(),this.name=`BVHHelper`,this.depth=n,this.mesh=e,this.bvh=t,this.displayParents=!1,this.displayEdges=!0,this.instanceId=0,this._roots=[];let r=new g({color:65416,transparent:!0,opacity:.3,depthWrite:!1}),i=new w({color:65416,transparent:!0,opacity:.3,depthWrite:!1});i.color=r.color,this.edgeMaterial=r,this.meshMaterial=i,this.update()}update(){let e=this.mesh,t=this.instanceId,n=this.bvh||e.boundsTree||e.geometry&&e.geometry.boundsTree||null;if(e&&e.isBatchedMesh&&e.boundsTrees&&!n&&t>=0){let r=e._drawInfo[t];r&&(n=e.boundsTrees[r.geometryIndex]||n)}let r=n?n._roots.length:0;for(;this._roots.length>r;){let e=this._roots.pop();e.geometry.dispose(),this.remove(e)}for(let e=0;e<r;e++){let{depth:t,edgeMaterial:r,meshMaterial:i,displayParents:a,displayEdges:o}=this;if(e>=this._roots.length){let i=new $r(n,r,t,e);this.add(i),this._roots.push(i)}let s=this._roots[e];s.bvh=n,s.depth=t,s.displayParents=a,s.displayEdges=o,s.material=o?r:i,s.update()}}updateMatrixWorld(...e){let t=this.mesh,n=this.parent,r=this.instanceId;t!==null&&(t.updateWorldMatrix(!0,!1),n?this.matrix.copy(n.matrixWorld).invert().multiply(t.matrixWorld):this.matrix.copy(t.matrixWorld),(t.isInstancedMesh||t.isBatchedMesh)&&r>=0&&(t.getMatrixAt(r,Zr),this.matrix.multiply(Zr)),this.matrix.decompose(this.position,this.quaternion,this.scale)),super.updateMatrixWorld(...e)}copy(e){this.depth=e.depth,this.mesh=e.mesh,this.bvh=e.bvh,this.opacity=e.opacity,this.color.copy(e.color)}clone(){return new e().copy(this)}dispose(){this.edgeMaterial.dispose(),this.meshMaterial.dispose();let e=this.children;for(let t=0,n=e.length;t<n;t++)e[t].geometry.dispose()}},ti=class extends ei{constructor(...e){console.warn(`MeshBVHHelper: Class has been deprecated. Use BVHHelper instead.`),super(...e)}},ni=new T,ri=new T;function ii(e){switch(typeof e){case`number`:return 8;case`string`:return e.length*2;case`boolean`:return 4;default:return 0}}function ai(e){return/(Uint|Int|Float)(8|16|32)Array/.test(e.constructor.name)}function oi(e,t){let n={nodeCount:0,leafNodeCount:0,depth:{min:1/0,max:-1/0},primitives:{min:1/0,max:-1/0},splits:[0,0,0],surfaceAreaScore:0};return e.traverse((e,t,r,i,a)=>{let o=r[3]-r[0],s=r[4]-r[1],c=r[5]-r[2],l=2*(o*s+s*c+c*o);n.nodeCount++,t?(n.leafNodeCount++,n.depth.min=Math.min(e,n.depth.min),n.depth.max=Math.max(e,n.depth.max),n.primitives.min=Math.min(a,n.primitives.min),n.primitives.max=Math.max(a,n.primitives.max),n.surfaceAreaScore+=l*ye*a):(n.splits[i]++,n.surfaceAreaScore+=l*1)},t),n.primitives.min===1/0&&(n.primitives.min=0,n.primitives.max=0),n.depth.min===1/0&&(n.depth.min=0,n.depth.max=0),n}function si(e){return e._roots.map((t,n)=>oi(e,n))}function ci(e){let t=new Set,n=[e],r=0;for(;n.length;){let e=n.pop();if(!t.has(e)){t.add(e);for(let t in e){if(!Object.hasOwn(e,t))continue;r+=ii(t);let i=e[t];i&&(typeof i==`object`||typeof i==`function`)?ai(i)||ft()&&i instanceof SharedArrayBuffer||i instanceof ArrayBuffer?r+=i.byteLength:n.push(i):r+=ii(i)}}}return r}function li(e){let t=[],n=new Float32Array(6),r=!0;return e.traverse((i,a,o,s,c)=>{t[i]={depth:i,isLeaf:a,boundingData:o,offset:s,count:c},O(0,o,ni);let l=t[i-1];if(a){e.writePrimitiveRangeBounds(s,c,n,0),ri.min.set(n[0],n[1],n[2]),ri.max.set(n[3],n[4],n[5]);let t=ni.containsBox(ri);console.assert(t,`Leaf bounds does not fully contain primitives.`),r&&=t}if(l){O(0,l.boundingData,ri);let e=ri.containsBox(ni);console.assert(e,`Parent bounds does not fully contain child.`),r&&=e}}),r}function ui(e){let t=[];return e.traverse((e,n,r,i,a)=>{let o={bounds:O(0,r,new T)};n?(o.count=a,o.offset=i):(o.left=null,o.right=null),t[e]=o;let s=t[e-1];s&&(s.left===null?s.left=o:s.right=o)}),t[0]}var di=!0,fi={Mesh:e.prototype.raycast,Line:le.prototype.raycast,LineSegments:h.prototype.raycast,LineLoop:a.prototype.raycast,Points:re.prototype.raycast,BatchedMesh:ie.prototype.raycast},$=new e,pi=[];function mi(t,n){if(this.isBatchedMesh)hi.call(this,t,n);else{let{geometry:r}=this;if(r.boundsTree)r.boundsTree.raycastObject3D(this,t,n);else{let r;if(this instanceof e)r=fi.Mesh;else if(this instanceof h)r=fi.LineSegments;else if(this instanceof a)r=fi.LineLoop;else if(this instanceof le)r=fi.Line;else if(this instanceof re)r=fi.Points;else throw Error(`BVH: Fallback raycast function not found.`);r.call(this,t,n)}}}function hi(e,t){if(this.boundsTrees){let n=this.boundsTrees,r=this._drawInfo||this._instanceInfo,i=this._drawRanges||this._geometryInfo,a=this.matrixWorld;$.material=this.material,$.geometry=this.geometry;let o=$.geometry.boundsTree,s=$.geometry.drawRange;$.geometry.boundingSphere===null&&($.geometry.boundingSphere=new v);for(let o=0,s=r.length;o<s;o++){if(!this.getVisibleAt(o))continue;let s=r[o].geometryIndex;if($.geometry.boundsTree=n[s],this.getMatrixAt(o,$.matrixWorld).premultiply(a),!$.geometry.boundsTree){this.getBoundingBoxAt(s,$.geometry.boundingBox),this.getBoundingSphereAt(s,$.geometry.boundingSphere);let e=i[s];$.geometry.setDrawRange(e.start,e.count)}$.raycast(e,pi);for(let e=0,n=pi.length;e<n;e++){let n=pi[e];n.object=this,n.batchId=o,t.push(n)}pi.length=0}$.geometry.boundsTree=o,$.geometry.drawRange=s,$.material=null,$.geometry=null}else fi.BatchedMesh.call(this,e,t)}function gi(e={}){let{type:t=nr}=e;return this.boundsTree=new t(this,e),this.boundsTree}function _i(){this.boundsTree=null}function vi(e=-1,t={}){if(!di)throw Error(`BatchedMesh: Three r166+ is required to compute bounds trees.`);t={...t,range:null};let n=this._drawRanges||this._geometryInfo,r=this._geometryCount;this.boundsTrees||=Array(r).fill(null);let i=this.boundsTrees;for(;i.length<r;)i.push(null);if(e<0){for(let e=0;e<r;e++)t.range=n[e],i[e]=new nr(this.geometry,t);return i}return e<n.length&&(t.range=n[e],i[e]=new nr(this.geometry,t)),i[e]||null}function yi(e=-1){e<0?this.boundsTrees.fill(null):e<this.boundsTrees.length&&(this.boundsTrees[e]=null)}function bi(e){switch(e){case 1:return`R`;case 2:return`RG`;case 3:return`RGBA`;case 4:return`RGBA`}throw Error()}function xi(e){switch(e){case 1:return ae;case 2:return f;case 3:return ce;case 4:return ce}}function Si(e){switch(e){case 1:return te;case 2:return t;case 3:return m;case 4:return m}}var Ci=class extends b{constructor(){super(),this.minFilter=y,this.magFilter=y,this.generateMipmaps=!1,this.overrideItemSize=null,this._forcedType=null}updateFrom(e){let t=this.overrideItemSize,n=e.itemSize,i=e.count;if(t!==null){if(n*i%t!==0)throw Error(`VertexAttributeTexture: overrideItemSize must divide evenly into buffer length.`);e.itemSize=t,e.count=i*n/t}let a=e.itemSize,o=e.count,c=e.normalized,l=e.array.constructor,d=l.BYTES_PER_ELEMENT,f=this._forcedType,p=a;if(f===null)switch(l){case Float32Array:f=ne;break;case Uint8Array:case Uint16Array:case Uint32Array:f=E;break;case Int8Array:case Int16Array:case Int32Array:f=s}let m,h,g,_,v=bi(a);switch(f){case ne:g=1,h=xi(a),c&&d===1?(_=l,v+=`8`,l===Uint8Array?m=r:(m=x,v+=`_SNORM`)):(_=Float32Array,v+=`32F`,m=ne);break;case s:v+=d*8+`I`,g=c?2**(l.BYTES_PER_ELEMENT*8-1):1,h=Si(a),d===1?(_=Int8Array,m=x):d===2?(_=Int16Array,m=ee):(_=Int32Array,m=s);break;case E:v+=d*8+`UI`,g=c?2**(l.BYTES_PER_ELEMENT*8-1):1,h=Si(a),d===1?(_=Uint8Array,m=r):d===2?(_=Uint16Array,m=u):(_=Uint32Array,m=E)}p===3&&(h===1023||h===1033)&&(p=4);let y=Math.ceil(Math.sqrt(o))||1,b=p*y*y,S=new _(b),C=e.normalized;e.normalized=!1;for(let t=0;t<o;t++){let n=p*t;S[n]=e.getX(t)/g,a>=2&&(S[n+1]=e.getY(t)/g),a>=3&&(S[n+2]=e.getZ(t)/g,p===4&&(S[n+3]=1)),a>=4&&(S[n+3]=e.getW(t)/g)}e.normalized=C,this.internalFormat=v,this.format=h,this.type=m,this.image.width=y,this.image.height=y,this.image.data=S,this.needsUpdate=!0,this.dispose(),e.itemSize=n,e.count=i}},wi=class extends Ci{constructor(){super(),this._forcedType=E}},Ti=class extends Ci{constructor(){super(),this._forcedType=s}},Ei=class extends Ci{constructor(){super(),this._forcedType=ne}},Di=class{constructor(){this.index=new wi,this.position=new Ei,this.bvhBounds=new b,this.bvhContents=new b,this._cachedIndexAttr=null,this.index.overrideItemSize=3}updateFrom(e){let{geometry:t}=e;if(ki(e,this.bvhBounds,this.bvhContents),this.position.updateFrom(t.attributes.position),e.indirect){let n=e._indirectBuffer;if(this._cachedIndexAttr===null||this._cachedIndexAttr.count!==n.length){if(t.index)this._cachedIndexAttr=t.index.clone();else{let e=ht(pt(t));this._cachedIndexAttr=new D(e,1,!1)}}Oi(t,n,this._cachedIndexAttr),this.index.updateFrom(this._cachedIndexAttr)}else this.index.updateFrom(t.index)}dispose(){let{index:e,position:t,bvhBounds:n,bvhContents:r}=this;e&&e.dispose(),t&&t.dispose(),n&&n.dispose(),r&&r.dispose()}};function Oi(e,t,n){let r=n.array,i=e.index?e.index.array:null;for(let e=0,n=t.length;e<n;e++){let n=3*e,a=3*t[e];for(let e=0;e<3;e++)r[n+e]=i?i[a+e]:a+e}}function ki(e,n,r){let i=e._roots;if(i.length!==1)throw Error(`MeshBVHUniformStruct: Multi-root BVHs not supported.`);let a=i[0],o=new Uint16Array(a),s=new Uint32Array(a),c=new Float32Array(a),l=a.byteLength/32,u=2*Math.ceil(Math.sqrt(l/2)),d=new Float32Array(4*u*u),f=Math.ceil(Math.sqrt(l)),p=new Uint32Array(2*f*f);for(let e=0;e<l;e++){let t=e*32/4,n=t*2,r=P(t);for(let t=0;t<3;t++)d[8*e+0+t]=c[r+0+t],d[8*e+4+t]=c[r+3+t];if(k(n,o)){let r=j(n,o),i=A(t,s),a=xe|r;p[e*2+0]=a,p[e*2+1]=i}else{let n=s[t+6],r=Oe(t,s);p[e*2+0]=r,p[e*2+1]=n}}n.image.data=d,n.image.width=u,n.image.height=u,n.format=ce,n.type=ne,n.internalFormat=`RGBA32F`,n.minFilter=y,n.magFilter=y,n.generateMipmaps=!1,n.needsUpdate=!0,n.dispose(),r.image.data=p,r.image.width=f,r.image.height=f,r.format=t,r.type=E,r.internalFormat=`RG32UI`,r.minFilter=y,r.magFilter=y,r.generateMipmaps=!1,r.needsUpdate=!0,r.dispose()}var Ai=new o,ji=new o,Mi=new o,Ni=new c,Pi=new o,Fi=new o,Ii=new c,Li=new c,Ri=new d,zi=new d;function Bi(e,t){if(!e&&!t)return;let n=e.count===t.count,r=e.normalized===t.normalized,i=e.array.constructor===t.array.constructor,a=e.itemSize===t.itemSize;if(!n||!r||!i||!a)throw Error()}function Vi(e,t=null){let n=e.array.constructor,r=e.normalized,i=e.itemSize,a=t===null?e.count:t;return new D(new n(i*a),i,r)}function Hi(e,t,n=0){if(e.isInterleavedBufferAttribute){let r=e.itemSize;for(let i=0,a=e.count;i<a;i++){let a=i+n;t.setX(a,e.getX(i)),r>=2&&t.setY(a,e.getY(i)),r>=3&&t.setZ(a,e.getZ(i)),r>=4&&t.setW(a,e.getW(i))}}else{let r=t.array,i=r.constructor,a=r.BYTES_PER_ELEMENT*e.itemSize*n;new i(r.buffer,a,e.array.length).set(e.array)}}function Ui(e,t,n){let r=e.elements,i=t.elements;for(let e=0,t=i.length;e<t;e++)r[e]+=i[e]*n}function Wi(e,t,n){let r=e.skeleton,i=e.geometry,a=r.bones,o=r.boneInverses;Ii.fromBufferAttribute(i.attributes.skinIndex,t),Li.fromBufferAttribute(i.attributes.skinWeight,t),Ri.elements.fill(0);for(let e=0;e<4;e++){let t=Li.getComponent(e);if(t!==0){let n=Ii.getComponent(e);zi.multiplyMatrices(a[n].matrixWorld,o[n]),Ui(Ri,zi,t)}}return Ri.multiply(e.bindMatrix).premultiply(e.bindMatrixInverse),n.transformDirection(Ri),n}function Gi(e,t,n,r,i){Pi.set(0,0,0);for(let a=0,o=e.length;a<o;a++){let o=t[a],s=e[a];o!==0&&(Fi.fromBufferAttribute(s,r),n?Pi.addScaledVector(Fi,o):Pi.addScaledVector(Fi.sub(i),o))}i.add(Pi)}function Ki(e,t={useGroups:!1,updateIndex:!1,skipAttributes:[]},n=new oe){let r=e[0].index!==null,{useGroups:i=!1,updateIndex:a=!1,skipAttributes:o=[]}=t,s=new Set(Object.keys(e[0].attributes)),c={},l=0;n.clearGroups();for(let t=0;t<e.length;++t){let a=e[t],o=0;if(r!==(a.index!==null))throw Error(`StaticGeometryGenerator: All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`);for(let e in a.attributes){if(!s.has(e))throw Error(`StaticGeometryGenerator: All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`);c[e]===void 0&&(c[e]=[]),c[e].push(a.attributes[e]),o++}if(o!==s.size)throw Error(`StaticGeometryGenerator: Make sure all geometries have the same number of attributes.`);if(i){let e;if(r)e=a.index.count;else if(a.attributes.position!==void 0)e=a.attributes.position.count;else throw Error(`StaticGeometryGenerator: The geometry must have either an index or a position attribute`);n.addGroup(l,e,t),l+=e}}if(r){let t=!1;if(!n.index){let r=0;for(let t=0;t<e.length;++t)r+=e[t].index.count;n.setIndex(new D(new Uint32Array(r),1,!1)),t=!0}if(a||t){let t=n.index,r=0,i=0;for(let n=0;n<e.length;++n){let a=e[n],s=a.index;if(o[n]!==!0)for(let e=0;e<s.count;++e)t.setX(r,s.getX(e)+i),r++;i+=a.attributes.position.count}}}for(let e in c){let t=c[e];if(!(e in n.attributes)){let r=0;for(let e in t)r+=t[e].count;n.setAttribute(e,Vi(c[e][0],r))}let r=n.attributes[e],i=0;for(let e=0,n=t.length;e<n;e++){let n=t[e];o[e]!==!0&&Hi(n,r,i),i+=n.count}}return n}function qi(e,t){if(e===null||t===null)return e===t;if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Ji(e){let{index:t,attributes:n}=e;if(t)for(let e=0,n=t.count;e<n;e+=3){let n=t.getX(e),r=t.getX(e+2);t.setX(e,r),t.setX(e+2,n)}else for(let e in n){let t=n[e],r=t.itemSize;for(let e=0,n=t.count;e<n;e+=3)for(let n=0;n<r;n++){let r=t.getComponent(e,n),i=t.getComponent(e+2,n);t.setComponent(e,n,i),t.setComponent(e+2,n,r)}}return e}var Yi=class{constructor(e){this.matrixWorld=new d,this.geometryHash=null,this.boneMatrices=null,this.primitiveCount=-1,this.mesh=e,this.update()}update(){let e=this.mesh,t=e.geometry,n=e.skeleton,r=(t.index?t.index.count:t.attributes.position.count)/3;if(this.matrixWorld.copy(e.matrixWorld),this.geometryHash=t.attributes.position.version,this.primitiveCount=r,n){n.boneTexture||n.computeBoneTexture(),n.update();let e=n.boneMatrices;!this.boneMatrices||this.boneMatrices.length!==e.length?this.boneMatrices=e.slice():this.boneMatrices.set(e)}else this.boneMatrices=null}didChange(){let e=this.mesh,t=e.geometry,n=(t.index?t.index.count:t.attributes.position.count)/3;return!(this.matrixWorld.equals(e.matrixWorld)&&this.geometryHash===t.attributes.position.version&&qi(e.skeleton&&e.skeleton.boneMatrices||null,this.boneMatrices)&&this.primitiveCount===n)}},Xi=class{constructor(e){Array.isArray(e)||(e=[e]);let t=[];e.forEach(e=>{e.traverseVisible(e=>{e.isMesh&&t.push(e)})}),this.meshes=t,this.useGroups=!0,this.applyWorldTransforms=!0,this.attributes=[`position`,`normal`,`color`,`tangent`,`uv`,`uv2`],this._intermediateGeometry=Array(t.length).fill().map(()=>new oe),this._diffMap=new WeakMap}getMaterials(){let e=[];return this.meshes.forEach(t=>{Array.isArray(t.material)?e.push(...t.material):e.push(t.material)}),e}generate(e=new oe){let t=[],{meshes:n,useGroups:r,_intermediateGeometry:i,_diffMap:a}=this;for(let e=0,r=n.length;e<r;e++){let r=n[e],o=i[e],s=a.get(r);!s||s.didChange(r)?(this._convertToStaticGeometry(r,o),t.push(!1),s?s.update():a.set(r,new Yi(r))):t.push(!0)}if(i.length===0){e.setIndex(null);let t=e.attributes;for(let n in t)e.deleteAttribute(n);for(let t in this.attributes)e.setAttribute(this.attributes[t],new D(new Float32Array,4,!1))}else Ki(i,{useGroups:r,skipAttributes:t},e);for(let t in e.attributes)e.attributes[t].needsUpdate=!0;return e}_convertToStaticGeometry(e,t=new oe){let n=e.geometry,r=this.applyWorldTransforms,i=this.attributes.includes(`normal`),a=this.attributes.includes(`tangent`),o=n.attributes,s=t.attributes;!t.index&&n.index&&(t.index=n.index.clone()),s.position||t.setAttribute(`position`,Vi(o.position)),i&&!s.normal&&o.normal&&t.setAttribute(`normal`,Vi(o.normal)),a&&!s.tangent&&o.tangent&&t.setAttribute(`tangent`,Vi(o.tangent)),Bi(n.index,t.index),Bi(o.position,s.position),i&&Bi(o.normal,s.normal),a&&Bi(o.tangent,s.tangent);let c=o.position,l=i?o.normal:null,u=a?o.tangent:null,d=n.morphAttributes.position,f=n.morphAttributes.normal,p=n.morphAttributes.tangent,m=n.morphTargetsRelative,h=e.morphTargetInfluences,g=new _;g.getNormalMatrix(e.matrixWorld),n.index&&t.index.array.set(n.index.array);for(let t=0,n=o.position.count;t<n;t++)Ai.fromBufferAttribute(c,t),l&&ji.fromBufferAttribute(l,t),u&&(Ni.fromBufferAttribute(u,t),Mi.fromBufferAttribute(u,t)),h&&(d&&Gi(d,h,m,t,Ai),f&&Gi(f,h,m,t,ji),p&&Gi(p,h,m,t,Mi)),e.isSkinnedMesh&&(e.applyBoneTransform(t,Ai),l&&Wi(e,t,ji),u&&Wi(e,t,Mi)),r&&Ai.applyMatrix4(e.matrixWorld),s.position.setXYZ(t,Ai.x,Ai.y,Ai.z),l&&(r&&ji.applyNormalMatrix(g),s.normal.setXYZ(t,ji.x,ji.y,ji.z)),u&&(r&&Mi.transformDirection(e.matrixWorld),s.tangent.setXYZW(t,Mi.x,Mi.y,Mi.z,Ni.w));for(let e in this.attributes){let n=this.attributes[e];n!==`position`&&n!==`tangent`&&n!==`normal`&&n in o&&(s[n]||t.setAttribute(n,Vi(o[n])),Bi(o[n],s[n]),Hi(o[n],s[n]))}return e.matrixWorld.determinant()<0&&Ji(t),t}},Zi=`

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`,Qi=`

float dot2( vec3 v ) {

	return dot( v, v );

}

// implementation from https://www.shadertoy.com/view/ttfGWl, though method 2 has been removed
// and is now available at this fork: https://www.shadertoy.com/view/WlB3zW
vec3 closestPointToTriangle( vec3 p, vec3 v0, vec3 v1, vec3 v2, out vec3 barycoord ) {

    vec3 v10 = v1 - v0;
    vec3 v21 = v2 - v1;
    vec3 v02 = v0 - v2;

	vec3 p0 = p - v0;
	vec3 p1 = p - v1;
	vec3 p2 = p - v2;

    vec3 nor = cross( v10, v02 );

    // method 2, in barycentric space
    vec3  q = cross( nor, p0 );
    float d = 1.0 / dot2( nor );
    float u = d * dot( q, v02 );
    float v = d * dot( q, v10 );
    float w = 1.0 - u - v;

	if( u < 0.0 ) {

		w = clamp( dot( p2, v02 ) / dot2( v02 ), 0.0, 1.0 );
		u = 0.0;
		v = 1.0 - w;

	} else if( v < 0.0 ) {

		u = clamp( dot( p0, v10 ) / dot2( v10 ), 0.0, 1.0 );
		v = 0.0;
		w = 1.0 - u;

	} else if( w < 0.0 ) {

		v = clamp( dot( p1, v21 ) / dot2( v21 ), 0.0, 1.0 );
		w = 0.0;
		u = 1.0 - v;

	}

	// output the barycoord in v0, v1, v2 weight order
	barycoord = vec3( w, u, v );
    return u * v1 + v * v2 + w * v0;

}

float distanceToTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// point and cut off range
	vec3 point, float closestDistanceSquared,

	// outputs
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord, inout float side, inout vec3 outPoint
) {

	bool found = false;
	vec3 localBarycoord;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		// get the closest point and barycoord
		vec3 closestPoint = closestPointToTriangle( point, a, b, c, localBarycoord );
		vec3 delta = point - closestPoint;
		float sqDist = dot2( delta );
		if ( sqDist < closestDistanceSquared ) {

			// set the output results
			closestDistanceSquared = sqDist;
			faceIndices = uvec4( indices.xyz, i );
			faceNormal = normalize( cross( a - b, b - c ) );
			barycoord = localBarycoord;
			outPoint = closestPoint;
			side = sign( dot( faceNormal, delta ) );

		}

	}

	return closestDistanceSquared;

}

float distanceSqToBounds( vec3 point, vec3 boundsMin, vec3 boundsMax ) {

	vec3 clampedPoint = clamp( point, boundsMin, boundsMax );
	vec3 delta = point - clampedPoint;
	return dot( delta, delta );

}

float distanceSqToBVHNodeBoundsPoint( vec3 point, sampler2D bvhBounds, uint currNodeIndex ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return distanceSqToBounds( point, boundsMin, boundsMax );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhClosestPointToPoint(		bvh,		point, maxDistance, faceIndices, faceNormal, barycoord, side, outPoint	)	_bvhClosestPointToPoint(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		point, maxDistance, faceIndices, faceNormal, barycoord, side, outPoint	)

float _bvhClosestPointToPoint(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// point to check
	vec3 point, float maxDistance,

	// output variables
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout vec3 outPoint
 ) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float closestDistanceSquared = maxDistance * maxDistance;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance = distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, currNodeIndex );
		if ( boundsHitDistance > closestDistanceSquared ) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );
		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;
			closestDistanceSquared = distanceToTriangles(
				bvh_position, bvh_index, offset, count, point, closestDistanceSquared,

				// outputs
				faceIndices, faceNormal, barycoord, side, outPoint
			);

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;
			bool leftToRight = distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, leftIndex ) < distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, rightIndex );//rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;
			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return sqrt( closestDistanceSquared );

}
`,$i=`

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;

			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return found;

}
`,ea=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`,ta=de({bvh_distance_functions:()=>Qi,bvh_ray_functions:()=>$i,bvh_struct_definitions:()=>ea,common_functions:()=>Zi}),na=ea,ra=Qi,ia=`
	${Zi}
	${$i}
`;export{pe as AVERAGE,dt as BVH,ei as BVHHelper,ta as BVHShaderGLSL,fe as CENTER,_e as CONTAINED,U as ExtendedTriangle,Ei as FloatVertexAttributeTexture,xt as GeometryBVH,ge as INTERSECTED,Ti as IntVertexAttributeTexture,pr as LineBVH,fr as LineLoopBVH,dr as LineSegmentsBVH,nr as MeshBVH,ti as MeshBVHHelper,Di as MeshBVHUniformStruct,he as NOT_INTERSECTED,Dr as ObjectBVH,W as OrientedBox,br as PointsBVH,me as SAH,Ce as SKIP_GENERATION,ve as STOP_TRAVERSAL,Jr as SkinnedMeshBVH,Xi as StaticGeometryGenerator,wi as UIntVertexAttributeTexture,Ci as VertexAttributeTexture,mi as acceleratedRaycast,vi as computeBatchedBoundsTree,gi as computeBoundsTree,yi as disposeBatchedBoundsTree,_i as disposeBoundsTree,ci as estimateMemoryInBytes,bt as generateIndirectBuffer,si as getBVHExtremes,ui as getJSONStructure,Zt as getTriangleHitPointInfo,ra as shaderDistanceFunction,ia as shaderIntersectFunction,na as shaderStructs,li as validateBounds};