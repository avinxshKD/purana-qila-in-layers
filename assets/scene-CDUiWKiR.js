const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/src-DVDxOBEf.js","assets/three.core-dZ9JXGve.js"])))=>i.map(i=>d[i]);
import{$ as e,$t as t,A as n,Bn as r,C as i,Cn as a,D as o,Dn as s,E as c,En as l,F as u,Fn as d,G as f,Gn as p,Hn as m,I as h,In as g,J as _,Jn as v,K as y,Kn as b,Ln as x,Mn as S,N as C,Nn as w,O as T,P as E,Pn as D,Q as O,Qn as ee,Qt as te,R as k,Rn as A,S as ne,St as re,T as j,Tn as M,Un as N,Vn as P,W as ie,Wn as F,X as I,Xn as L,Y as ae,Yn as R,Z as z,Zn as B,_ as oe,a as se,an as ce,at as le,b as V,bn as ue,bt as de,d as fe,dn as pe,dt as me,en as he,et as ge,f as H,fn as _e,ft as ve,g as ye,gt as be,h as xe,hn as Se,i as U,in as Ce,it as we,j as Te,jn as Ee,k as De,kn as Oe,l as ke,lt as Ae,m as je,mn as Me,mt as W,n as Ne,nn as Pe,nt as Fe,o as G,on as Ie,ot as K,p as Le,pn as Re,q as ze,qn as Be,rt as q,s as J,st as Y,tn as X,tt as Ve,u as He,ut as Ue,v as We,vn as Ge,w as Ke,wn as qe,x as Je,xn as Ye,xt as Xe,y as Ze,yn as Qe,zn as $e}from"./three.core-dZ9JXGve.js";import{C as et,F as tt,M as nt,N as rt,O as it,P as at,a as ot,c as st,d as ct,f as lt,h as ut,i as dt,j as ft,l as pt,m as mt,n as ht,o as gt,p as _t,r as vt,s as yt,t as bt,u as xt}from"./preload-helper-Bcbq78-J.js";function St(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Ct(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Z={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Q={common:{diffuse:{value:new H(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new z},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new z}},envmap:{envMap:{value:null},envMapRotation:{value:new z},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new z}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new z}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new z},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new z},normalScale:{value:new d(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new z},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new z}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new z}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new z}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new H(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new H(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0},uvTransform:{value:new z}},sprite:{diffuse:{value:new H(16777215)},opacity:{value:1},center:{value:new d(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new z},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0}}},wt={basic:{uniforms:R([Q.common,Q.specularmap,Q.envmap,Q.aomap,Q.lightmap,Q.fog]),vertexShader:Z.meshbasic_vert,fragmentShader:Z.meshbasic_frag},lambert:{uniforms:R([Q.common,Q.specularmap,Q.envmap,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.fog,Q.lights,{emissive:{value:new H(0)},envMapIntensity:{value:1}}]),vertexShader:Z.meshlambert_vert,fragmentShader:Z.meshlambert_frag},phong:{uniforms:R([Q.common,Q.specularmap,Q.envmap,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.fog,Q.lights,{emissive:{value:new H(0)},specular:{value:new H(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Z.meshphong_vert,fragmentShader:Z.meshphong_frag},standard:{uniforms:R([Q.common,Q.envmap,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.roughnessmap,Q.metalnessmap,Q.fog,Q.lights,{emissive:{value:new H(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Z.meshphysical_vert,fragmentShader:Z.meshphysical_frag},toon:{uniforms:R([Q.common,Q.aomap,Q.lightmap,Q.emissivemap,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.gradientmap,Q.fog,Q.lights,{emissive:{value:new H(0)}}]),vertexShader:Z.meshtoon_vert,fragmentShader:Z.meshtoon_frag},matcap:{uniforms:R([Q.common,Q.bumpmap,Q.normalmap,Q.displacementmap,Q.fog,{matcap:{value:null}}]),vertexShader:Z.meshmatcap_vert,fragmentShader:Z.meshmatcap_frag},points:{uniforms:R([Q.points,Q.fog]),vertexShader:Z.points_vert,fragmentShader:Z.points_frag},dashed:{uniforms:R([Q.common,Q.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Z.linedashed_vert,fragmentShader:Z.linedashed_frag},depth:{uniforms:R([Q.common,Q.displacementmap]),vertexShader:Z.depth_vert,fragmentShader:Z.depth_frag},normal:{uniforms:R([Q.common,Q.bumpmap,Q.normalmap,Q.displacementmap,{opacity:{value:1}}]),vertexShader:Z.meshnormal_vert,fragmentShader:Z.meshnormal_frag},sprite:{uniforms:R([Q.sprite,Q.fog]),vertexShader:Z.sprite_vert,fragmentShader:Z.sprite_frag},background:{uniforms:{uvTransform:{value:new z},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Z.background_vert,fragmentShader:Z.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new z}},vertexShader:Z.backgroundCube_vert,fragmentShader:Z.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Z.cube_vert,fragmentShader:Z.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Z.equirect_vert,fragmentShader:Z.equirect_frag},distance:{uniforms:R([Q.common,Q.displacementmap,{referencePosition:{value:new g},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Z.distance_vert,fragmentShader:Z.distance_frag},shadow:{uniforms:R([Q.lights,Q.fog,{color:{value:new H(0)},opacity:{value:1}}]),vertexShader:Z.shadow_vert,fragmentShader:Z.shadow_frag}};wt.physical={uniforms:R([wt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new z},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new z},clearcoatNormalScale:{value:new d(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new z},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new z},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new z},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new z},sheen:{value:0},sheenColor:{value:new H(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new z},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new z},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new z},transmissionSamplerSize:{value:new d},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new z},attenuationDistance:{value:0},attenuationColor:{value:new H(0)},specularColor:{value:new H(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new z},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new z},anisotropyVector:{value:new d},anisotropyMap:{value:null},anisotropyMapTransform:{value:new z}}]),vertexShader:Z.meshphysical_vert,fragmentShader:Z.meshphysical_frag};var Tt={r:0,b:0,g:0},Et=new O,Dt=new z;Dt.set(-1,0,0,0,1,0,0,0,1);function Ot(t,n,r,i,a,o){let s=new H(0),c=a===!0?0:1,l,u,d=null,f=0,p=null;function m(e){let t=e.isScene===!0?e.background:null;if(t&&t.isTexture){let r=e.backgroundBlurriness>0;t=n.get(t,r)}return t}function h(e){let n=!1,i=m(e);i===null?_(s,c):i&&i.isColor&&(_(i,1),n=!0);let a=t.xr.getEnvironmentBlendMode();a===`additive`?r.buffers.color.setClear(0,0,0,1,o):a===`alpha-blend`&&r.buffers.color.setClear(0,0,0,0,o),(t.autoClear||n)&&(r.buffers.depth.setTest(!0),r.buffers.depth.setMask(!0),r.buffers.color.setMask(!0),t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil))}function g(n,r){let a=m(r);a&&a.isCubeTexture?(u===void 0&&(u=new e(new se(1,1,1),new Me({name:`BackgroundCubeMaterial`,uniforms:P(wt.backgroundCube.uniforms),vertexShader:wt.backgroundCube.vertexShader,fragmentShader:wt.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute(`normal`),u.geometry.deleteAttribute(`uv`),u.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(u)),u.material.uniforms.envMap.value=a,u.material.uniforms.backgroundBlurriness.value=r.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=r.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Et.makeRotationFromEuler(r.backgroundRotation)).transpose(),a.isRenderTargetTexture===!1&&u.material.uniforms.backgroundRotation.value.premultiply(Dt),u.material.toneMapped=Le.getTransfer(a.colorSpace)!==_e,(d!==a||f!==a.version||p!==t.toneMapping)&&(u.material.needsUpdate=!0,d=a,f=a.version,p=t.toneMapping),u.layers.enableAll(),n.unshift(u,u.geometry,u.material,0,0,null)):a&&a.isTexture&&(l===void 0&&(l=new e(new ve(2,2),new Me({name:`BackgroundMaterial`,uniforms:P(wt.background.uniforms),vertexShader:wt.background.vertexShader,fragmentShader:wt.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=a,l.material.uniforms.backgroundIntensity.value=r.backgroundIntensity,l.material.toneMapped=Le.getTransfer(a.colorSpace)!==_e,a.matrixAutoUpdate===!0&&a.updateMatrix(),l.material.uniforms.uvTransform.value.copy(a.matrix),(d!==a||f!==a.version||p!==t.toneMapping)&&(l.material.needsUpdate=!0,d=a,f=a.version,p=t.toneMapping),l.layers.enableAll(),n.unshift(l,l.geometry,l.material,0,0,null))}function _(e,n){e.getRGB(Tt,Be(t)),r.buffers.color.setClear(Tt.r,Tt.g,Tt.b,n,o)}function v(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return s},setClearColor:function(e,t=1){s.set(e),c=t,_(s,c)},getClearAlpha:function(){return c},setClearAlpha:function(e){c=e,_(s,c)},render:h,addToRenderList:g,dispose:v}}function kt(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function At(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function jt(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(B(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&B(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&B(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function Mt(e){let t=this,n=null,r=0,i=!1,a=!1,o=new me,s=new z,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Nt=class extends $e{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new oe(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;let r={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new se(5,5,5),a=new Me({name:`CubemapFromEquirect`,uniforms:P(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:1,blending:0});a.uniforms.tEquirect.value=n;let o=new e(i,a),s=n.minFilter;return n.minFilter===1008&&(n.minFilter=ie),new xe(1,10,this).update(t,o),n.minFilter=s,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Pt=256,Ft=3,It=20,Lt=256,Rt=16,zt=3,Bt=new g,Vt=new H,Ht=class t{constructor(t){this._renderer=t,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new xe(1,10,null),this._boxMesh=new e(new se(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Bt}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(Vt));let h=new xe(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Yt(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Jt(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Pt,p(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?Pt:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=Ut(e,!1,!1),n=Math.log2(e)-Ft;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=Ut(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=Yt()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Jt()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(e){this._ggxMaterial===null&&(this._ggxMaterial=Gt(),this._integrationMaterial=Kt());let n=this._cubeSize,r=e.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/Rt);for(let o=0;o<=r;o++){let s=t.lodToRoughness(o,r);if(o>r-zt)a.roughness.value=s,this._renderCube(e,o,this._integrationMaterial);else{let t=s>0?Math.log2(n)+.5*Math.log2(6/(Lt*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=t,this._renderCube(e,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=qt());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function Ut(e,t,n){return new Nt(e,{minFilter:f,generateMipmaps:t,type:E,colorSpace:ze,depthBuffer:n})}function Wt(e,t,n){return new Me({name:e,uniforms:t,vertexShader:Z.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function Gt(){return Wt(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Lt}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Kt(){return Wt(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Rt}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function qt(){return Wt(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${It}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Jt(){return Wt(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Yt(){return Wt(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Xt(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Nt(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Ht(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Ht(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Zt(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&ee(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Qt(e,t,n,r){let i={},o=new WeakMap,s=new FinalizationRegistry(e=>delete i[e]);function c(e){l(e.target)}function l(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,c),delete i[e.id],s.unregister(e);let a=o.get(e);a&&(t.remove(a),o.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function u(e,t){return i[t.id]===void 0&&(t.addEventListener(`dispose`,c),i[t.id]=new WeakRef(t),s.register(t,t.id,t),n.memory.geometries++),t}function d(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function f(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let s=n===null?r.array.length/3-1:n.array.length,c=new(r.count>=65535?qe:a)(Math.ceil(s/3)*6,1),l=c.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<s;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];l[n++]=r,l[n++]=i,l[n++]=i,l[n++]=a,l[n++]=a,l[n++]=r}}else{i=r.version;for(let e=0,t=0;e<s;e+=3){let n=e+0,r=e+1,i=e+2;l[t++]=n,l[t++]=r,l[t++]=r,l[t++]=i,l[t++]=i,l[t++]=n}}c.version=i;let u=o.get(e);u&&t.remove(u),o.set(e,c)}function p(e){let t=o.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&f(e)}else f(e);return o.get(e)}function m(){for(let e in i){let t=i[e].deref();t!==void 0&&l(t)}}return{get:u,update:d,getWireframeAttribute:p,dispose:m}}function $t(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function en(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:F(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function tn(e,t,n){let r=new WeakMap,i=new x;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,f=r.get(o);if(f===void 0||f.count!==u){f!==void 0&&f.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],p=0;e===!0&&(p=1),n===!0&&(p=2),a===!0&&(p=3);let m=o.attributes.position.count*p,h=1;m>t.maxTextureSize&&(h=Math.ceil(m/t.maxTextureSize),m=t.maxTextureSize);let g=new Float32Array(m*h*4*u),_=new Ze(g,m,h,u);_.type=De,_.needsUpdate=!0;let v=p*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=m*h*4*t;for(let t=0;t<r.count;t++){let s=t*v;e===!0&&(i.fromBufferAttribute(r,t),g[d+s+0]=i.x,g[d+s+1]=i.y,g[d+s+2]=i.z,g[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),g[d+s+4]=i.x,g[d+s+5]=i.y,g[d+s+6]=i.z,g[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),g[d+s+8]=i.x,g[d+s+9]=i.y,g[d+s+10]=i.z,g[d+s+11]=u.itemSize===4?i.w:1)}}f={count:u,texture:_,size:new d(m,h)},r.set(o,f);function y(){_.dispose(),r.delete(o),o.removeEventListener(`dispose`,y)}o.addEventListener(`dispose`,y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,f.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,f.size)}return{update:a}}function nn(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var rn={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function an(t,n,r,a,o,s){let c=new $e(n,r,{type:t,depthBuffer:o,stencilBuffer:s,samples:a?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),l=null,u=null,d=null,f=new J;f.setAttribute(`position`,new T([-1,3,0,-1,-1,0,3,-1,0],3)),f.setAttribute(`uv`,new T([0,2,0,0,2,0],2));let p=new he({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),m=new e(f,p),h=new Ae(-1,1,1,-1,0,1),g=null,_=null,v=!1,y,b=null,x=[],S=!1;this.setSize=function(e,t){c.setSize(e,t),l!==null&&l.setSize(e,t),u!==null&&u.setSize(e,t);for(let n=0;n<x.length;n++){let r=x[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){x=e,S=x.length>0&&x[0].isRenderPass===!0;let t=c.width,n=c.height;x.length>0&&l===null&&(l=new $e(t,n,{type:E,depthBuffer:!1,stencilBuffer:!1}),u=new $e(t,n,{type:E,depthBuffer:!1,stencilBuffer:!1}));let r=o===!0&&x.some(e=>e.needsDepthTexture===!0);r!==(c.depthTexture!==null)&&(r===!0&&d===null&&(d=new Ke(t,n),s===!0&&(d.format=i,d.type=Oe)),c.dispose(),c.depthTexture=r?d:null,c.resolveDepthBuffer=r,c.storeMultisampledDepthBuffer=r);for(let e=0;e<x.length;e++){let i=x[e];i.setSize&&i.setSize(t,n),r&&i.needsDepthTexture===!0&&i.setDepthTexture&&i.setDepthTexture(d)}},this.begin=function(e,t){if(v||e.toneMapping===0&&x.length===0)return!1;if(b=t,t!==null){let e=t.width,n=t.height;(c.width!==e||c.height!==n)&&this.setSize(e,n)}return S===!1&&e.setRenderTarget(c),y=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return S},this.end=function(e,t){e.toneMapping=y,v=!0;let n=c,r=l;for(let i=0;i<x.length;i++){let a=x[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===l?u:l))}if(g!==e.outputColorSpace||_!==e.toneMapping){g=e.outputColorSpace,_=e.toneMapping,p.defines={},Le.getTransfer(g)===`srgb`&&(p.defines.SRGB_TRANSFER=``);let t=rn[_];t&&(p.defines[t]=``),p.needsUpdate=!0}p.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(b),e.render(m,h),b=null,v=!1},this.isCompositing=function(){return v},this.dispose=function(){c.dispose(),l!==null&&l.dispose(),u!==null&&u.dispose(),f.dispose(),p.dispose()}}var on=new Ye,sn=new Ke(1,1),cn=new ye(1),ln=new Ze,un=new We,dn=new oe,fn=[],pn=[],mn=new Float32Array(16),hn=new Float32Array(9),gn=new Float32Array(4);function _n(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=fn[i];if(a===void 0&&(a=new Float32Array(i),fn[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function vn(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function yn(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function bn(e,t){let n=pn[t];n===void 0&&(n=new Int32Array(t),pn[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function xn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Sn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(vn(n,t))return;e.uniform2fv(this.addr,t),yn(n,t)}}function Cn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(vn(n,t))return;e.uniform3fv(this.addr,t),yn(n,t)}}function wn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(vn(n,t))return;e.uniform4fv(this.addr,t),yn(n,t)}}function Tn(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(vn(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),yn(n,t)}else{if(vn(n,r))return;gn.set(r),e.uniformMatrix2fv(this.addr,!1,gn),yn(n,r)}}function En(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(vn(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),yn(n,t)}else{if(vn(n,r))return;hn.set(r),e.uniformMatrix3fv(this.addr,!1,hn),yn(n,r)}}function Dn(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(vn(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),yn(n,t)}else{if(vn(n,r))return;mn.set(r),e.uniformMatrix4fv(this.addr,!1,mn),yn(n,r)}}function On(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function kn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(vn(n,t))return;e.uniform2iv(this.addr,t),yn(n,t)}}function An(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(vn(n,t))return;e.uniform3iv(this.addr,t),yn(n,t)}}function jn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(vn(n,t))return;e.uniform4iv(this.addr,t),yn(n,t)}}function Mn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Nn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(vn(n,t))return;e.uniform2uiv(this.addr,t),yn(n,t)}}function Pn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(vn(n,t))return;e.uniform3uiv(this.addr,t),yn(n,t)}}function Fn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(vn(n,t))return;e.uniform4uiv(this.addr,t),yn(n,t)}}function In(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function Ln(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?In(sn):on,n.setTexture2D(t||a,i)}function Rn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||un,i)}function zn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?In(cn):dn,n.setTextureCube(t||a,i)}function Bn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||ln,i)}function Vn(e){switch(e){case 5126:return xn;case 35664:return Sn;case 35665:return Cn;case 35666:return wn;case 35674:return Tn;case 35675:return En;case 35676:return Dn;case 5124:case 35670:return On;case 35667:case 35671:return kn;case 35668:case 35672:return An;case 35669:case 35673:return jn;case 5125:return Mn;case 36294:return Nn;case 36295:return Pn;case 36296:return Fn;case 35678:case 36198:case 36298:case 36306:case 35682:return Ln;case 35679:case 36299:case 36307:return Rn;case 35680:case 36300:case 36308:case 36293:return zn;case 36289:case 36303:case 36311:case 36292:return Bn}}function Hn(e,t){e.uniform1fv(this.addr,t)}function Un(e,t){let n=_n(t,this.size,2);e.uniform2fv(this.addr,n)}function Wn(e,t){let n=_n(t,this.size,3);e.uniform3fv(this.addr,n)}function Gn(e,t){let n=_n(t,this.size,4);e.uniform4fv(this.addr,n)}function Kn(e,t){let n=_n(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function qn(e,t){let n=_n(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Jn(e,t){let n=_n(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Yn(e,t){e.uniform1iv(this.addr,t)}function Xn(e,t){e.uniform2iv(this.addr,t)}function Zn(e,t){e.uniform3iv(this.addr,t)}function Qn(e,t){e.uniform4iv(this.addr,t)}function $n(e,t){e.uniform1uiv(this.addr,t)}function er(e,t){e.uniform2uiv(this.addr,t)}function tr(e,t){e.uniform3uiv(this.addr,t)}function nr(e,t){e.uniform4uiv(this.addr,t)}function rr(e,t,n){let r=this.cache,i=t.length,a=bn(n,i);vn(r,a)||(e.uniform1iv(this.addr,a),yn(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?In(sn):on;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function ir(e,t,n){let r=this.cache,i=t.length,a=bn(n,i);vn(r,a)||(e.uniform1iv(this.addr,a),yn(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||un,a[e])}function ar(e,t,n){let r=this.cache,i=t.length,a=bn(n,i);vn(r,a)||(e.uniform1iv(this.addr,a),yn(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?In(cn):dn;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function or(e,t,n){let r=this.cache,i=t.length,a=bn(n,i);vn(r,a)||(e.uniform1iv(this.addr,a),yn(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||ln,a[e])}function sr(e){switch(e){case 5126:return Hn;case 35664:return Un;case 35665:return Wn;case 35666:return Gn;case 35674:return Kn;case 35675:return qn;case 35676:return Jn;case 5124:case 35670:return Yn;case 35667:case 35671:return Xn;case 35668:case 35672:return Zn;case 35669:case 35673:return Qn;case 5125:return $n;case 36294:return er;case 36295:return tr;case 36296:return nr;case 35678:case 36198:case 36298:case 36306:case 35682:return rr;case 35679:case 36299:case 36307:return ir;case 35680:case 36300:case 36308:case 36293:return ar;case 36289:case 36303:case 36311:case 36292:return or}}var cr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Vn(t.type)}},lr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=sr(t.type)}},ur=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},dr=/(\w+)(\])?(\[|\.)?/g;function fr(e,t){e.seq.push(t),e.map[t.id]=t}function pr(e,t,n){let r=e.name,i=r.length;for(dr.lastIndex=0;;){let a=dr.exec(r),o=dr.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){fr(n,l===void 0?new cr(s,e,t):new lr(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new ur(s),fr(n,e)),n=e}}}var mr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);pr(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function hr(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var gr=37297,_r=0;function vr(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var yr=new z;function br(e){Le._getMatrix(yr,Le.workingColorSpace,e);let t=`mat3( ${yr.elements.map(e=>e.toFixed(4))} )`;switch(Le.getTransfer(e)){case _:return[t,`LinearTransferOETF`];case _e:return[t,`sRGBTransferOETF`];default:return B(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function xr(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+vr(e.getShaderSource(t),r)}return i}function Sr(e,t){let n=br(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var Cr={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function wr(e,t){let n=Cr[t];return n===void 0?(B(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var Tr=new g;function Er(){return Le.getLuminanceCoefficients(Tr),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${Tr.x.toFixed(4)}, ${Tr.y.toFixed(4)}, ${Tr.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Dr(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(Ar).join(`
`)}function Or(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function kr(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function Ar(e){return e!==``}function jr(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function Mr(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Nr=/^[ \t]*#include +<([\w\d./]+)>/gm;function Pr(e){return e.replace(Nr,Fr)}function Fr(e,t){let n=Z[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return Pr(n)}var Ir=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Lr(e){return e.replace(Ir,Rr)}function Rr(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function zr(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Br={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Vr(e){return Br[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Hr={302:`ENVMAP_MODE_REFRACTION`};function Ur(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Hr[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Wr={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Gr(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Wr[e.combine]||`ENVMAP_BLENDING_NONE`}function Kr(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Vr(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=Ur(n),d=Gr(n),f=Dr(n),p=Or(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(Ar).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(Ar).join(`
`),g.length>0&&(g+=`
`)):(h=[zr(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(Ar).join(`
`),g=[zr(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Z.tonemapping_pars_fragment,n.toneMapping===0?``:wr(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Z.colorspace_pars_fragment,Sr(`linearToOutputTexel`,n.outputColorSpace),Er(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(Ar).join(`
`)),o=Pr(o),o=jr(o,n),o=Mr(o,n),s=Pr(s),s=jr(s,n),s=Mr(s,n),o=Lr(o),s=Lr(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=hr(i,i.VERTEX_SHADER,v),x=hr(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=xr(i,b,`vertex`),n=xr(i,x,`fragment`);F(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):B(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new mr(i,m),w=kr(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,gr)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=_r++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var qr=0,Jr=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Yr(e),t.set(e,n)),n}},Yr=class{constructor(e){this.id=qr++,this.code=e,this.usedTimes=0}};function Xr(e){return e===1030||e===37490||e===36285}function Zr(e,t,n,r,i,a){let o=new k,s=new Jr,c=new Set,u=[],d=new Map,f=r.logarithmicDepthBuffer,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,d,h){let g=u.fog,_=d.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=p[i.type],S=r.precision;i.precision!==null&&(S=r.getMaxPrecision(i.precision),S!==i.precision&&B(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,ee;if(x){let e=wt[x];E=e.vertexShader,D=e.fragmentShader}else{E=i.vertexShader,D=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,ee=t.id}let te=e.getRenderTarget(),k=e.state.buffers.depth.getReversed(),A=d.isInstancedMesh===!0,ne=d.isBatchedMesh===!0,re=!!i.map,j=!!i.matcap,M=!!b,N=M&&b.isPMREMTexture===!0,P=!!i.aoMap,ie=!!i.lightMap,F=!!i.bumpMap&&i.wireframe===!1,I=!!i.normalMap,L=!!i.displacementMap,ae=!!i.emissiveMap,R=!!i.metalnessMap,z=!!i.roughnessMap,oe=i.anisotropy>0,se=i.clearcoat>0,ce=i.diffuseRoughness>0,le=i.dispersion>0,V=i.retroreflectivity>0,ue=i.iridescence>0,de=i.sheen>0,fe=i.transmission>0,pe=oe&&!!i.anisotropyMap,me=se&&!!i.clearcoatMap,he=se&&!!i.clearcoatNormalMap,ge=se&&!!i.clearcoatRoughnessMap,H=ce&&!!i.diffuseRoughnessMap,_e=ue&&!!i.iridescenceMap,ve=ue&&!!i.iridescenceThicknessMap,ye=de&&!!i.sheenColorMap,be=de&&!!i.sheenRoughnessMap,xe=!!i.specularMap,Se=!!i.specularColorMap,U=!!i.specularIntensityMap,Ce=fe&&!!i.transmissionMap,we=fe&&!!i.thicknessMap,Te=!!i.gradientMap,Ee=!!i.alphaMap,De=i.alphaTest>0,Oe=!!i.alphaHash,ke=!!i.extensions,Ae=0;i.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(Ae=e.toneMapping);let je=N?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,Me={shaderID:x,shaderType:i.type,shaderName:i.name,vertexShader:E,fragmentShader:D,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:ee,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:S,batching:ne,batchingColor:ne&&d._colorsTexture!==null,instancing:A,instancingColor:A&&d.instanceColor!==null,instancingMorph:A&&d.morphTexture!==null,outputColorSpace:te===null?e.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:Le.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:re,matcap:j,envMap:M,envMapMode:M&&b.mapping,envMapPMREM:N,envMapMaxLod:N?je.length-1:null,envMapSize:N?je[0].width:null,aoMap:P,lightMap:ie,bumpMap:F,normalMap:I,displacementMap:L,emissiveMap:ae,normalMapObjectSpace:I&&i.normalMapType===1,normalMapTangentSpace:I&&i.normalMapType===0,packedNormalMap:I&&i.normalMapType===0&&Xr(i.normalMap.format),metalnessMap:R,roughnessMap:z,anisotropy:oe,anisotropyMap:pe,clearcoat:se,clearcoatMap:me,clearcoatNormalMap:he,clearcoatRoughnessMap:ge,diffuseRoughness:ce,diffuseRoughnessMap:H,dispersion:le,retroreflection:V,iridescence:ue,iridescenceMap:_e,iridescenceThicknessMap:ve,sheen:de,sheenColorMap:ye,sheenRoughnessMap:be,specularMap:xe,specularColorMap:Se,specularIntensityMap:U,transmission:fe,transmissionMap:Ce,thicknessMap:we,gradientMap:Te,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ee,alphaTest:De,alphaHash:Oe,combine:i.combine,mapUv:re&&m(i.map.channel),aoMapUv:P&&m(i.aoMap.channel),lightMapUv:ie&&m(i.lightMap.channel),bumpMapUv:F&&m(i.bumpMap.channel),normalMapUv:I&&m(i.normalMap.channel),displacementMapUv:L&&m(i.displacementMap.channel),emissiveMapUv:ae&&m(i.emissiveMap.channel),metalnessMapUv:R&&m(i.metalnessMap.channel),roughnessMapUv:z&&m(i.roughnessMap.channel),anisotropyMapUv:pe&&m(i.anisotropyMap.channel),clearcoatMapUv:me&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:he&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ge&&m(i.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:H&&m(i.diffuseRoughnessMap.channel),iridescenceMapUv:_e&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:ye&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:be&&m(i.sheenRoughnessMap.channel),specularMapUv:xe&&m(i.specularMap.channel),specularColorMapUv:Se&&m(i.specularColorMap.channel),specularIntensityMapUv:U&&m(i.specularIntensityMap.channel),transmissionMapUv:Ce&&m(i.transmissionMap.channel),thicknessMapUv:we&&m(i.thicknessMap.channel),alphaMapUv:Ee&&m(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(I||oe),vertexNormals:!!_.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:d.isPoints===!0&&!!_.attributes.uv&&(re||Ee),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&I===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:k,skinning:d.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ae,decodeVideoTexture:re&&i.map.isVideoTexture===!0&&Le.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ae&&i.emissiveMap.isVideoTexture===!0&&Le.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:ke&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(ke&&i.extensions.multiDraw===!0||ne)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Me.vertexUv1s=c.has(1),Me.vertexUv2s=c.has(2),Me.vertexUv3s=c.has(3),c.clear(),Me}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.diffuseRoughness&&o.enable(25),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=wt[t];n=l.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=d.get(n);return r===void 0?(r=new Kr(e,n,t,i),u.push(r),d.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=u.indexOf(e);u[t]=u[u.length-1],u.pop(),d.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:u,dispose:C}}function Qr(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function $r(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function ei(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function ti(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||$r),r.length>1&&r.sort(t||ei),i.length>1&&i.sort(t||ei)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function ni(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new ti,e.set(t,[i])):n>=r.length?(i=new ti,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function ri(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new g,color:new H};break;case`SpotLight`:n={position:new g,direction:new g,color:new H,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new g,color:new H,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new g,skyColor:new H,groundColor:new H};break;case`RectAreaLight`:n={color:new H,position:new g,halfWidth:new g,halfHeight:new g}}return e[t.id]=n,n}}}function ii(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new d};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new d};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new d,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var ai=0;function oi(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function si(e){let t=new ri,n=ii(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new g);let i=new g,a=new O,o=new O;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(oi);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Q.LTC_FLOAT_1,r.rectAreaLTC2=Q.LTC_FLOAT_2):(r.rectAreaLTC1=Q.LTC_HALF_1,r.rectAreaLTC2=Q.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=ai++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function ci(e){let t=new si(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function li(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new ci(e),t.set(n,[a])):r>=i.length?(a=new ci(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var ui=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,di=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,fi=[new g(1,0,0),new g(-1,0,0),new g(0,1,0),new g(0,-1,0),new g(0,0,1),new g(0,0,-1)],pi=[new g(0,-1,0),new g(0,-1,0),new g(0,0,1),new g(0,0,-1),new g(0,-1,0),new g(0,-1,0)],mi=new O,hi=new g,gi=new g;function _i(t,r,i){let a=new n,o=new d,s=new d,c=new x,l=new Ve,u=new Fe,f={},p=i.maxTextureSize,m={0:1,1:0,2:2},h=new Me({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new d},radius:{value:4}},vertexShader:ui,fragmentShader:di}),g=h.clone();g.defines.HORIZONTAL_PASS=1;let _=new J;_.setAttribute(`position`,new G(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new e(_,h),y=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let b=this.type;this.render=function(e,n,r){if(y.enabled===!1||y.autoUpdate===!1&&y.needsUpdate===!1||e.length===0)return;this.type===2&&(B(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let i=t.getRenderTarget(),l=t.getActiveCubeFace(),u=t.getActiveMipmapLevel(),d=t.state;d.setBlending(0),d.buffers.depth.getReversed()===!0?d.buffers.color.setClear(0,0,0,0):d.buffers.color.setClear(1,1,1,1),d.buffers.depth.setTest(!0),d.setScissorTest(!1);let f=b!==this.type;f&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let i=0,l=e.length;i<l;i++){let l=e[i],u=l.shadow;if(u===void 0){B(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(u.autoUpdate===!1&&u.needsUpdate===!1)continue;o.copy(u.mapSize);let m=u.getFrameExtents();o.multiply(m),s.copy(u.mapSize),(o.x>p||o.y>p)&&(o.x>p&&(s.x=Math.floor(p/m.x),o.x=s.x*m.x,u.mapSize.x=s.x),o.y>p&&(s.y=Math.floor(p/m.y),o.y=s.y*m.y,u.mapSize.y=s.y));let h=t.state.buffers.depth.getReversed();if(u.camera._reversedDepth=h,u.map===null||f===!0){if(u.map!==null&&(u.map.depthTexture!==null&&(u.map.depthTexture.dispose(),u.map.depthTexture=null),u.map.dispose()),this.type===3){if(l.isPointLight){B(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}u.map=new $e(o.x,o.y,{format:te,type:E,minFilter:ie,magFilter:ie,generateMipmaps:!1}),u.map.texture.name=l.name+`.shadowMap`,u.map.depthTexture=new Ke(o.x,o.y,De),u.map.depthTexture.name=l.name+`.shadowMapDepth`,u.map.depthTexture.format=ne,u.map.depthTexture.compareFunction=null,u.map.depthTexture.minFilter=le,u.map.depthTexture.magFilter=le}else l.isPointLight?(u.map=new Nt(o.x),u.map.depthTexture=new ye(o.x,Ee)):(u.map=new $e(o.x,o.y),u.map.depthTexture=new Ke(o.x,o.y,Ee)),u.map.depthTexture.name=l.name+`.shadowMap`,u.map.depthTexture.format=ne,this.type===1?(u.map.depthTexture.compareFunction=h?518:515,u.map.depthTexture.minFilter=ie,u.map.depthTexture.magFilter=ie):(u.map.depthTexture.compareFunction=null,u.map.depthTexture.minFilter=le,u.map.depthTexture.magFilter=le);u.camera.updateProjectionMatrix()}u.map.isWebGLCubeRenderTarget!==!0&&(u.map.width!==o.x||u.map.height!==o.y)&&u.map.setSize(o.x,o.y);let g=u.map.isWebGLCubeRenderTarget?6:u.getViewportCount();l.isPointLight!==!0&&u.updateMatrices(l,r);let _=u.camera.layers.mask&4294967294?u.camera.layers:r.layers;for(let e=0;e<g;e++){let i=u.getCamera(e);if(l.isPointLight){let t=u.camera,n=u.matrix,r=l.distance||t.far;r!==t.far&&(t.far=r,t.updateProjectionMatrix()),hi.setFromMatrixPosition(l.matrixWorld),t.position.copy(hi),gi.copy(t.position),gi.add(fi[e]),t.up.copy(pi[e]),t.lookAt(gi),t.updateMatrixWorld(),n.makeTranslation(-hi.x,-hi.y,-hi.z),mi.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),u._frustum.setFromProjectionMatrix(mi,t.coordinateSystem,t.reversedDepth)}if(u.map.isWebGLCubeRenderTarget)t.setRenderTarget(u.map,e),t.clear();else{e===0&&(t.setRenderTarget(u.map),t.clear());let n=u.getViewport(e);c.set(s.x*n.x,s.y*n.y,s.x*n.z,s.y*n.w),d.viewport(c)}a=u.getFrustum(e),w(n,r,i,l,_,this.type)}u.isPointLightShadow!==!0&&this.type===3&&S(u,r),u.needsUpdate=!1}b=this.type,y.needsUpdate=!1,t.setRenderTarget(i,l,u)};function S(e,n){let i=r.update(v);h.defines.VSM_SAMPLES!==e.blurSamples&&(h.defines.VSM_SAMPLES=e.blurSamples,g.defines.VSM_SAMPLES=e.blurSamples,h.needsUpdate=!0,g.needsUpdate=!0),e.mapPass===null?e.mapPass=new $e(o.x,o.y,{format:te,type:E}):(e.mapPass.width!==e.map.width||e.mapPass.height!==e.map.height)&&e.mapPass.setSize(e.map.width,e.map.height),h.uniforms.shadow_pass.value=e.map.depthTexture,h.uniforms.resolution.value.set(e.map.width,e.map.height),h.uniforms.radius.value=e.radius,t.setRenderTarget(e.mapPass),t.clear(),t.renderBufferDirect(n,null,i,h,v,null),g.uniforms.shadow_pass.value=e.mapPass.texture,g.uniforms.resolution.value.set(e.map.width,e.map.height),g.uniforms.radius.value=e.radius,t.setRenderTarget(e.map),t.clear(),t.renderBufferDirect(n,null,i,g,v,null)}function C(e,n,r,i){let a=null,o=r.isPointLight===!0?e.customDistanceMaterial:e.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,t.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=f[e];r===void 0&&(r={},f[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,T)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?m[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let e=t.properties.get(a);e.light=r}return a}function w(e,n,i,o,s,c){if(e.visible===!1)return;if(e.layers.test(s)&&(e.isMesh||e.isLine||e.isPoints)&&(e.castShadow||e.receiveShadow&&c===3)&&(!e.frustumCulled||e.intersectsFrustum(a))){e.modelViewMatrix.multiplyMatrices(i.matrixWorldInverse,e.matrixWorld);let a=r.update(e),s=e.material;if(Array.isArray(s)){let r=a.groups;for(let l=0,u=r.length;l<u;l++){let u=r[l],d=s[u.materialIndex];if(d&&d.visible){let r=C(e,d,o,c);e.onBeforeShadow(t,e,n,i,a,r,u),t.renderBufferDirect(i,null,a,r,e,u),e.onAfterShadow(t,e,n,i,a,r,u)}}}else if(s.visible){let r=C(e,s,o,c);e.onBeforeShadow(t,e,n,i,a,r,null),t.renderBufferDirect(i,null,a,r,e,null),e.onAfterShadow(t,e,n,i,a,r,null)}}let l=e.children;for(let e=0,t=l.length;e<t;e++)w(l[e],n,i,o,s,c)}function T(e){e.target.removeEventListener(`dispose`,T);for(let t in f){let n=f[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function vi(e,t){function n(){let t=!1,n=new x,r=null,i=new x(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?B(e.DEPTH_TEST):oe(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=Ie[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?B(e.STENCIL_TEST):oe(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c={},l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,S=null,C=null,w=null,T=new H(0,0,0),E=0,D=!1,O=null,ee=null,te=null,k=null,A=null,ne=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),re=!1,j=0,M=e.getParameter(e.VERSION);M.indexOf(`WebGL`)===-1?M.indexOf(`OpenGL ES`)!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(M)[1]),re=j>=2):(j=parseFloat(/^WebGL (\d)/.exec(M)[1]),re=j>=1);let N=null,P={},ie=e.getParameter(e.SCISSOR_BOX),I=e.getParameter(e.VIEWPORT),L=new x().fromArray(ie),ae=new x().fromArray(I);function R(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let z={};z[e.TEXTURE_2D]=R(e.TEXTURE_2D,e.TEXTURE_2D,1),z[e.TEXTURE_CUBE_MAP]=R(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),z[e.TEXTURE_2D_ARRAY]=R(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),z[e.TEXTURE_3D]=R(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),B(e.DEPTH_TEST),o.setFunc(3),pe(!1),me(1),B(e.CULL_FACE),de(0);function B(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function oe(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function se(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function ce(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function le(t){return h!==t&&(e.useProgram(t),h=t,!0)}let V={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};V[103]=e.MIN,V[104]=e.MAX;let ue={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function de(t,n,r,i,a,o,s,c,l,u){if(t===0)g===!0&&(oe(e.BLEND),g=!1);else if(g===!1&&(B(e.BLEND),g=!0),t!==5){if(t!==_||u!==D){if((v!==100||S!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,S=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:F(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:F(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:F(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:F(`WebGLState: Invalid blending: `,t)}y=null,b=null,C=null,w=null,T.set(0,0,0),E=0,_=t,D=u}}else a||=n,o||=r,s||=i,(n!==v||a!==S)&&(e.blendEquationSeparate(V[n],V[a]),v=n,S=a),(r!==y||i!==b||o!==C||s!==w)&&(e.blendFuncSeparate(ue[r],ue[i],ue[o],ue[s]),y=r,b=i,C=o,w=s),(c.equals(T)===!1||l!==E)&&(e.blendColor(c.r,c.g,c.b,l),T.copy(c),E=l),_=t,D=!1}function fe(t,n){t.side===2?oe(e.CULL_FACE):B(e.CULL_FACE);let r=t.side===1;n&&(r=!r),pe(r),t.blending===1&&t.transparent===!1?de(0):de(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ge(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?B(e.SAMPLE_ALPHA_TO_COVERAGE):oe(e.SAMPLE_ALPHA_TO_COVERAGE)}function pe(t){O!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),O=t)}function me(t){t===0?oe(e.CULL_FACE):(B(e.CULL_FACE),t!==ee&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),ee=t}function he(t){t!==te&&(re&&e.lineWidth(t),te=t)}function ge(t,n,r){t?(B(e.POLYGON_OFFSET_FILL),(k!==n||A!==r)&&(k=n,A=r,o.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):oe(e.POLYGON_OFFSET_FILL)}function _e(t){t?B(e.SCISSOR_TEST):oe(e.SCISSOR_TEST)}function ve(t){t===void 0&&(t=e.TEXTURE0+ne-1),N!==t&&(e.activeTexture(t),N=t)}function ye(t,n,r){r===void 0&&(r=N===null?e.TEXTURE0+ne-1:N);let i=P[r];i===void 0&&(i={type:void 0,texture:void 0},P[r]=i),(i.type!==t||i.texture!==n)&&(N!==r&&(e.activeTexture(r),N=r),e.bindTexture(t,n||z[t]),i.type=t,i.texture=n)}function be(){let t=P[N];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function xe(){try{e.compressedTexImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Se(){try{e.compressedTexImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function U(){try{e.texSubImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ce(){try{e.texSubImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function we(){try{e.compressedTexSubImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Te(){try{e.compressedTexSubImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ee(){try{e.texStorage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function De(){try{e.texStorage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Oe(){try{e.texImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function ke(){try{e.texImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ae(t){return d[t]===void 0?e.getParameter(t):d[t]}function je(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function Me(t){L.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),L.copy(t))}function W(t){ae.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ae.copy(t))}function Ne(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function Pe(t,n,r){let i=l.get(n).get(t);c[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),c[i]=r)}function Fe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},N=null,P={},f={},c={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,S=null,C=null,w=null,T=new H(0,0,0),E=0,D=!1,O=null,ee=null,te=null,k=null,A=null,L.set(0,0,e.canvas.width,e.canvas.height),ae.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:B,disable:oe,bindFramebuffer:se,drawBuffers:ce,useProgram:le,setBlending:de,setMaterial:fe,setFlipSided:pe,setCullFace:me,setLineWidth:he,setPolygonOffset:ge,setScissorTest:_e,activeTexture:ve,bindTexture:ye,unbindTexture:be,compressedTexImage2D:xe,compressedTexImage3D:Se,texImage2D:Oe,texImage3D:ke,pixelStorei:je,getParameter:Ae,updateUBOMapping:Ne,uniformBlockBinding:Pe,texStorage2D:Ee,texStorage3D:De,texSubImage2D:U,texSubImage3D:Ce,compressedTexSubImage2D:we,compressedTexSubImage3D:Te,scissor:Me,viewport:W,reset:Fe}}function yi(e,t,n,r,a,o,s){let c=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,l=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),u=new d,p=new WeakMap,m=new Set,h,g=new WeakMap,v=new Set,x=new FinalizationRegistry(e=>v.delete(e)),S=!1;try{S=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function C(e,t){return S?new OffscreenCanvas(e,t):N(`canvas`)}function w(e,t,n){let r=1,i=G(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);h===void 0&&(h=C(n,a));let o=t?C(n,a):h;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),B(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&B(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function T(e){return e.generateMipmaps}function E(t){e.generateMipmap(t)}function D(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function O(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];B(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||B(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?_:Le.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function ee(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,B(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function te(e,t){return T(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function k(e){let t=new WeakRef(e);r.get(e).__ref=t,v.add(t),x.register(e,t,t)}function A(e){let t=r.get(e).__ref;t!==void 0&&(v.delete(t),x.unregister(t))}function ne(e){j(e.target)}function re(e){M(e.target)}function j(e){e.removeEventListener(`dispose`,ne),A(e),I(e),e.isVideoTexture&&p.delete(e),e.isHTMLTexture&&m.delete(e)}function M(e){e.removeEventListener(`dispose`,re),A(e),ae(e)}function P(){for(let e of v){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?M(t):j(t))}v.clear(),m.clear()}function I(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=g.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&L(e),Object.keys(i).length===0&&g.delete(n)}r.remove(e)}function L(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=g.get(i);delete a[n.__cacheKey],s.memory.textures--}function ae(t){let n=r.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let i=t.depthTexture;if(i&&i.renderTarget===t&&j(i),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=r.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),s.memory.textures--),r.remove(a[t])}r.remove(t)}let R=0;function z(){R=0}function oe(){return R}function se(e){R=e}function V(){let e=R;return e>=a.maxTextures&&B(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+a.maxTextures),R+=1,e}function ue(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function de(t,i){let a=r.get(t);if(t.isVideoTexture&&Pe(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)B(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)B(`WebGLRenderer: Texture marked for update but image is incomplete`);else{Se(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function pe(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?Se(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function me(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?Se(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function he(t,i){let a=r.get(t);t.version>0&&a.__version!==t.version?U(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let ge={[ce]:e.REPEAT,[fe]:e.CLAMP_TO_EDGE,[we]:e.MIRRORED_REPEAT},H={[le]:e.NEAREST,[Y]:e.NEAREST_MIPMAP_NEAREST,[K]:e.NEAREST_MIPMAP_LINEAR,[ie]:e.LINEAR,[y]:e.LINEAR_MIPMAP_NEAREST,[f]:e.LINEAR_MIPMAP_LINEAR},_e={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function ve(n,i){if(i.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(i.magFilter===1006||i.magFilter===1007||i.magFilter===1005||i.magFilter===1008||i.minFilter===1006||i.minFilter===1007||i.minFilter===1005||i.minFilter===1008)&&B(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,ge[i.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,ge[i.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,ge[i.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,H[i.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,H[i.minFilter]),i.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,_e[i.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(i.magFilter===1003||i.minFilter!==1005&&i.minFilter!==1008||i.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(i.anisotropy>1||r.get(i).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(i.anisotropy,a.getMaxAnisotropy())),r.get(i).__currentAnisotropy=i.anisotropy}}}function ye(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,ne),k(n));let i=n.source,a=g.get(i);a===void 0&&(a={},g.set(i,a));let o=ue(n);if(o!==t.__cacheKey){a[o]===void 0&&(a[o]={texture:e.createTexture(),usedTimes:0},s.memory.textures++,r=!0),a[o].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&L(n)),t.__cacheKey=o,t.__webglTexture=a[o].texture}return r}function be(e,t,n){return Math.floor(Math.floor(e/n)/t)}function xe(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=be(n.start,r.width,4),c=be(t.start,r.width,4);n.start<=i+1&&a===c&&be(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function Se(t,s,c){let l=e.TEXTURE_2D;(s.isDataArrayTexture||s.isCompressedArrayTexture)&&(l=e.TEXTURE_2D_ARRAY),s.isData3DTexture&&(l=e.TEXTURE_3D);let u=ye(t,s),d=s.source;n.bindTexture(l,t.__webglTexture,e.TEXTURE0+c);let f=r.get(d);if(d.version!==f.__version||u===!0){if(n.activeTexture(e.TEXTURE0+c),!(typeof ImageBitmap<`u`&&s.image instanceof ImageBitmap)){let t=Le.getPrimaries(Le.workingColorSpace),r=s.colorSpace===``?null:Le.getPrimaries(s.colorSpace),i=s.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,s.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,s.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,s.unpackAlignment);let t=w(s.image,!1,a.maxTextureSize);t=Fe(s,t);let r=o.convert(s.format,s.colorSpace),p=o.convert(s.type),h=O(s.internalFormat,r,p,s.normalized,s.colorSpace,s.isVideoTexture);ve(l,s);let g,_=s.mipmaps,v=s.isVideoTexture!==!0,y=f.__version===void 0||u===!0,x=d.dataReady,S=te(s,t);if(s.isDepthTexture)h=ee(s.format===i,s.type),y&&(v?n.texStorage2D(e.TEXTURE_2D,1,h,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,h,t.width,t.height,0,r,p,null));else if(s.isDataTexture){if(_.length>0){v&&y&&n.texStorage2D(e.TEXTURE_2D,S,h,_[0].width,_[0].height);for(let t=0,i=_.length;t<i;t++)g=_[t],v?x&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,g.width,g.height,r,p,g.data):n.texImage2D(e.TEXTURE_2D,t,h,g.width,g.height,0,r,p,g.data);s.generateMipmaps=!1}else v?(y&&n.texStorage2D(e.TEXTURE_2D,S,h,t.width,t.height),x&&xe(s,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,h,t.width,t.height,0,r,p,t.data)}else if(s.isCompressedTexture){if(s.isCompressedArrayTexture){v&&y&&n.texStorage3D(e.TEXTURE_2D_ARRAY,S,h,_[0].width,_[0].height,t.depth);for(let i=0,a=_.length;i<a;i++)if(g=_[i],s.format!==1023){if(r!==null){if(v){if(x){if(s.layerUpdates.size>0){let t=b(g.width,g.height,s.format,s.type);for(let a of s.layerUpdates){let o=g.data.subarray(a*t/g.data.BYTES_PER_ELEMENT,(a+1)*t/g.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,g.width,g.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,g.width,g.height,t.depth,r,g.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,h,g.width,g.height,t.depth,0,g.data,0,0)}else B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else v?x&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,g.width,g.height,t.depth,r,p,g.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,h,g.width,g.height,t.depth,0,r,p,g.data);s.layerUpdates.size>0&&s.clearLayerUpdates()}else{v&&y&&n.texStorage2D(e.TEXTURE_2D,S,h,_[0].width,_[0].height);for(let t=0,i=_.length;t<i;t++)g=_[t],s.format===1023?v?x&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,g.width,g.height,r,p,g.data):n.texImage2D(e.TEXTURE_2D,t,h,g.width,g.height,0,r,p,g.data):r===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):v?x&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,g.width,g.height,r,g.data):n.compressedTexImage2D(e.TEXTURE_2D,t,h,g.width,g.height,0,g.data)}}else if(s.isDataArrayTexture){if(v){if(y&&n.texStorage3D(e.TEXTURE_2D_ARRAY,S,h,t.width,t.height,t.depth),x){if(s.layerUpdates.size>0){let i=b(t.width,t.height,s.format,s.type);for(let a of s.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}s.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,h,t.width,t.height,t.depth,0,r,p,t.data)}else if(s.isData3DTexture)v?(y&&n.texStorage3D(e.TEXTURE_3D,S,h,t.width,t.height,t.depth),x&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,h,t.width,t.height,t.depth,0,r,p,t.data);else if(s.isFramebufferTexture){if(y){if(v)n.texStorage2D(e.TEXTURE_2D,S,h,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<S;t++)n.texImage2D(e.TEXTURE_2D,t,h,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(s.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),m.add(s),n.onpaint=e=>{let t=e.changedElements;for(let e of m)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(_.length>0){if(v&&y){let t=G(_[0]);n.texStorage2D(e.TEXTURE_2D,S,h,t.width,t.height)}for(let t=0,i=_.length;t<i;t++)g=_[t],v?x&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,g):n.texImage2D(e.TEXTURE_2D,t,h,r,p,g);s.generateMipmaps=!1}else if(v){if(y){let r=G(t);n.texStorage2D(e.TEXTURE_2D,S,h,r.width,r.height)}x&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,h,r,p,t);T(s)&&s.mipmapsAutoUpdate===!0&&E(l),f.__version=d.version,s.onUpdate&&s.onUpdate(s)}t.__version=s.version}function U(t,s,c){if(s.image.length!==6)return;let l=ye(t,s),u=s.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+c);let d=r.get(u);if(u.version!==d.__version||l===!0){n.activeTexture(e.TEXTURE0+c);let t=Le.getPrimaries(Le.workingColorSpace),r=s.colorSpace===``?null:Le.getPrimaries(s.colorSpace),f=s.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,s.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,s.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,s.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,f);let p=s.isCompressedTexture||s.image[0].isCompressedTexture,m=s.image[0]&&s.image[0].isDataTexture,h=[];for(let e=0;e<6;e++)!p&&!m?h[e]=w(s.image[e],!0,a.maxCubemapSize):h[e]=m?s.image[e].image:s.image[e],h[e]=Fe(s,h[e]);let g=h[0],_=o.convert(s.format,s.colorSpace),v=o.convert(s.type),y=O(s.internalFormat,_,v,s.normalized,s.colorSpace),b=s.isVideoTexture!==!0,x=d.__version===void 0||l===!0,S=u.dataReady,C=te(s,g);ve(e.TEXTURE_CUBE_MAP,s);let D;if(s.isDepthTexture){if(y=ee(s.format===i,s.type),x){if(b)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,y,g.width,g.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,y,g.width,g.height,0,_,v,null)}}else if(p){b&&x&&n.texStorage2D(e.TEXTURE_CUBE_MAP,C,y,g.width,g.height);for(let t=0;t<6;t++){D=h[t].mipmaps;for(let r=0;r<D.length;r++){let i=D[r];s.format===1023?b?S&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,_,v,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,y,i.width,i.height,0,_,v,i.data):_===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):b?S&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,_,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,y,i.width,i.height,0,i.data)}}}else{if(D=s.mipmaps,b&&x){D.length>0&&C++;let t=G(h[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,C,y,t.width,t.height)}for(let t=0;t<6;t++)if(m){b?S&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,h[t].width,h[t].height,_,v,h[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,y,h[t].width,h[t].height,0,_,v,h[t].data);for(let r=0;r<D.length;r++){let i=D[r].image[t].image;b?S&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,_,v,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,y,i.width,i.height,0,_,v,i.data)}}else{b?S&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,_,v,h[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,y,_,v,h[t]);for(let r=0;r<D.length;r++){let i=D[r];b?S&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,_,v,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,y,_,v,i.image[t])}}}T(s)&&s.mipmapsAutoUpdate===!0&&E(e.TEXTURE_CUBE_MAP),d.__version=u.version,s.onUpdate&&s.onUpdate(s)}t.__version=s.version}function Ce(t,i,a,s,l,u){let d=o.convert(a.format,a.colorSpace),f=o.convert(a.type),p=O(a.internalFormat,d,f,a.normalized,a.colorSpace),m=r.get(i),h=r.get(a);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Ne(i)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,s,l,h.__webglTexture,0,W(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,s,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Te(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=ee(n.stencilBuffer,a),s=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Ne(n)?c.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,W(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,W(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,s,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let a=t[i],s=o.convert(a.format,a.colorSpace),l=o.convert(a.type),u=O(a.internalFormat,s,l,a.normalized,a.colorSpace);Ne(n)?c.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,W(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,W(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Ee(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let s=r.get(i.depthTexture);s.__renderTarget=i;let l=o?i.depthTexture.image[0]:i.depthTexture.image;s.__webglTexture&&l.width===i.width&&l.height===i.height||(l.width=i.width,l.height=i.height,i.depthTexture.needsUpdate=!0),o?he(i.depthTexture,0):de(i.depthTexture,0);let u=s.__webglTexture,d=W(i),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)Ne(i)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)Ne(i)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function De(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)Ee(i.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?Ee(i.__webglFramebuffer[0],t,0):Ee(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),Te(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),Te(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Oe(t,n,i){let a=r.get(t);n!==void 0&&Ce(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&De(t)}function ke(t){let i=t.texture,a=r.get(t),c=r.get(i);t.addEventListener(`dispose`,re),k(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,s.memory.textures++),u){a.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps.length>0){a.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)a.__webglFramebuffer[t][n]=e.createFramebuffer()}else a.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps.length>0){a.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)a.__webglFramebuffer[t]=e.createFramebuffer()}else a.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),s.memory.textures++)}if(t.samples>0&&Ne(t)===!1){a.__webglMultisampledFramebuffer=e.createFramebuffer(),a.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,a.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];a.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,a.__webglColorRenderbuffer[n]);let i=o.convert(r.format,r.colorSpace),s=o.convert(r.type),c=O(r.internalFormat,i,s,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=W(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,a.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(a.__webglDepthRenderbuffer=e.createRenderbuffer(),Te(a.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),ve(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)Ce(a.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else Ce(a.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);T(i)?E(e.TEXTURE_CUBE_MAP):i.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}else if(d){for(let i=0,o=l.length;i<o;i++){let o=l[i],s=r.get(o),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,s.__webglTexture),ve(c,o),Ce(a.__webglFramebuffer,t,o,e.COLOR_ATTACHMENT0+i,c,0),T(o)&&E(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),ve(r,i),i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)Ce(a.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else Ce(a.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);T(i)?E(r):i.mipmaps.length>0&&e.texParameteri(r,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&De(t)}function Ae(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(T(a)&&a.mipmapsAutoUpdate===!0){let t=D(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),E(t),n.unbindTexture()}}}let je=[];function Me(t){if(t.samples>0){if(Ne(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,c=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),l===!0&&(je.length=0,je.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&je.push(c),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,je))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&l){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function W(e){return Math.min(a.maxSamples,e.samples)}function Ne(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function Pe(e){let t=s.render.frame;p.get(e)!==t&&(p.set(e,t),e.update())}function Fe(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Le.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&B(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):F(`WebGLTextures: Unsupported texture color space:`,n)),t}function G(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(u.width=e.naturalWidth||e.width,u.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(u.width=e.displayWidth,u.height=e.displayHeight):(u.width=e.width,u.height=e.height),u}this.allocateTextureUnit=V,this.resetTextureUnits=z,this.getTextureUnits=oe,this.setTextureUnits=se,this.setTexture2D=de,this.setTexture2DArray=pe,this.setTexture3D=me,this.setTextureCube=he,this.rebindTextures=Oe,this.setupRenderTarget=ke,this.updateRenderTargetMipmap=Ae,this.updateMultisampleRenderTarget=Me,this.setupDepthRenderbuffer=De,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=Ne,this.dispose=P}function bi(e,t){function n(n,r=``){let i,a=Le.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var xi=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Si=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Ci=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new o(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let n=t.cameras[0].viewport,r=new Me({vertexShader:xi,fragmentShader:Si,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new e(new ve(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},wi=class extends c{constructor(e,t){super();let n=this,a=null,c=1,l=null,u=`local-floor`,f=1,p=null,m=null,h=null,g=null,_=null,v=null,y=typeof XRWebGLBinding<`u`,b=new Ci,S={},C=t.getContextAttributes(),w=null,T=null,E=[],D=[],O=new d,ee=null,te=null,k=new Ue;k.viewport=new x;let A=new Ue;A.viewport=new x;let re=[k,A],j=new Ne,M=null,N=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=E[e];return t===void 0&&(t=new r,E[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=E[e];return t===void 0&&(t=new r,E[e]=t),t.getGripSpace()},this.getHand=function(e){let t=E[e];return t===void 0&&(t=new r,E[e]=t),t.getHandSpace()};function P(e){let t=D.indexOf(e.inputSource);if(t===-1)return;let n=E[t];n!==void 0&&(n.update(e.inputSource,e.frame,p||l),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ie(){a.removeEventListener(`select`,P),a.removeEventListener(`selectstart`,P),a.removeEventListener(`selectend`,P),a.removeEventListener(`squeeze`,P),a.removeEventListener(`squeezestart`,P),a.removeEventListener(`squeezeend`,P),a.removeEventListener(`end`,ie),a.removeEventListener(`inputsourceschange`,F);for(let e=0;e<E.length;e++){let t=D[e];t!==null&&(D[e]=null,E[e].disconnect(t))}M=null,N=null,b.reset();for(let e in S)delete S[e];if(e.setRenderTarget(w),_=null,g=null,h=null,a=null,T=null,z.stop(),n.isPresenting=!1,e.setPixelRatio(ee),e.setSize(O.width,O.height,!1),te!==null){let e=te.camera;e.fov=te.fov,e.zoom=te.zoom,e.updateProjectionMatrix(),te=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){c=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){u=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return p||l},this.setReferenceSpace=function(e){p=e},this.getBaseLayer=function(){return g===null?_:g},this.getBinding=function(){return h===null&&y&&(h=new XRWebGLBinding(a,t)),h},this.getFrame=function(){return v},this.getSession=function(){return a},this.setSession=async function(r){if(a=r,a!==null){if(w=e.getRenderTarget(),a.addEventListener(`select`,P),a.addEventListener(`selectstart`,P),a.addEventListener(`selectend`,P),a.addEventListener(`squeeze`,P),a.addEventListener(`squeezestart`,P),a.addEventListener(`squeezeend`,P),a.addEventListener(`end`,ie),a.addEventListener(`inputsourceschange`,F),C.xrCompatible!==!0&&await t.makeXRCompatible(),ee=e.getPixelRatio(),e.getSize(O),y&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,r=null,o=null;C.depth&&(o=C.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=C.stencil?i:ne,r=C.stencil?Oe:Ee);let l={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:c};h=this.getBinding(),g=h.createProjectionLayer(l),a.updateRenderState({layers:[g]}),e.setPixelRatio(1),e.setSize(g.textureWidth,g.textureHeight,!1),T=new $e(g.textureWidth,g.textureHeight,{format:Xe,type:s,depthTexture:new Ke(g.textureWidth,g.textureHeight,r,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:C.stencil,colorSpace:e.outputColorSpace,samples:C.antialias?4:0,resolveDepthBuffer:g.ignoreDepthValues===!1,resolveStencilBuffer:g.ignoreDepthValues===!1,storeMultisampledDepthBuffer:g.ignoreDepthValues===!1,storeMultisampledStencilBuffer:g.ignoreDepthValues===!1})}else{let n={antialias:C.antialias,alpha:!0,depth:C.depth,stencil:C.stencil,framebufferScaleFactor:c};_=new XRWebGLLayer(a,t,n),a.updateRenderState({baseLayer:_}),e.setPixelRatio(1),e.setSize(_.framebufferWidth,_.framebufferHeight,!1),T=new $e(_.framebufferWidth,_.framebufferHeight,{format:Xe,type:s,colorSpace:e.outputColorSpace,stencilBuffer:C.stencil,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1,storeMultisampledDepthBuffer:_.ignoreDepthValues===!1,storeMultisampledStencilBuffer:_.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(f),p=null,l=await a.requestReferenceSpace(u),z.setContext(a),z.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return b.getDepthTexture()};function F(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=D.indexOf(n);r>=0&&(D[r]=null,E[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=D.indexOf(n);if(r===-1){for(let e=0;e<E.length;e++)if(e>=D.length){D.push(n),r=e;break}else if(D[e]===null){D[e]=n,r=e;break}if(r===-1)break}let i=E[r];i&&i.connect(n)}}function I(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(a===null)return;let t=e.near,n=e.far;b.texture!==null&&(b.depthNear>0&&(t=b.depthNear),b.depthFar>0&&(n=b.depthFar)),j.near=A.near=k.near=t,j.far=A.far=k.far=n,(M!==j.near||N!==j.far)&&(a.updateRenderState({depthNear:j.near,depthFar:j.far}),M=j.near,N=j.far),j.layers.mask=e.layers.mask|6,k.layers.mask=j.layers.mask&-5,A.layers.mask=j.layers.mask&-3;let r=e.parent,i=j.cameras;I(j,r);for(let e=0;e<i.length;e++)I(i[e],r);j.projectionMatrix.copy(k.projectionMatrix),j.projectionMatrixInverse.copy(k.projectionMatrixInverse),te===null&&e.isPerspectiveCamera&&(te={camera:e,fov:e.fov,zoom:e.zoom}),L(e,j,r)};function L(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=be*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return j},this.getFoveation=function(){if(g!==null||_!==null)return f},this.setFoveation=function(e){f=e,g!==null&&(g.fixedFoveation=e),_!==null&&_.fixedFoveation!==void 0&&(_.fixedFoveation=e)},this.hasDepthSensing=function(){return b.texture!==null},this.getDepthSensingMesh=function(){return b.getMesh(j)},this.getCameraTexture=function(e){return S[e]};let ae=null;function R(t,r){if(m=r.getViewerPose(p||l),v=r,m!==null){let t=m.views;_!==null&&(e.setRenderTargetFramebuffer(T,_.framebuffer),e.setRenderTarget(T));let r=!1;t.length!==j.cameras.length&&(j.cameras.length=0,r=!0);for(let n=0;n<t.length;n++){let i=t[n],a=null;if(_!==null)a=_.getViewport(i);else{let t=h.getViewSubImage(g,i);a=t.viewport,n===0&&(e.setRenderTargetTextures(T,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(T))}let o=re[n];o===void 0&&(o=new Ue,o.layers.enable(n),o.viewport=new x,re[n]=o),o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(i.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(j.matrix.copy(o.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale)),r===!0&&j.cameras.push(o)}let i=a.enabledFeatures;if(i&&i.includes(`depth-sensing`)&&a.depthUsage==`gpu-optimized`&&y){h=n.getBinding();let e=h.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&b.init(e,a.renderState)}if(i&&i.includes(`camera-access`)&&y){e.state.unbindTexture(),h=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=S[n];e||(e=new o,S[n]=e);let t=h.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<E.length;e++){let t=D[e],n=E[e];t!==null&&n!==void 0&&n.update(t,r,p||l)}ae&&ae(t,r),r.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:r}),v=null}let z=new St;z.setAnimationLoop(R),this.setAnimationLoop=function(e){ae=e},this.dispose=function(){}}},Ti=new O,Ei=new z;Ei.set(-1,0,0,0,1,0,0,0,1);function Di(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Be(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(Ti.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Ei),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Oi(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?B(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):B(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var ki=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Ai=null;function ji(){return Ai===null&&(Ai=new V(ki,16,16,te,E),Ai.name=`DFG_LUT`,Ai.minFilter=ie,Ai.magFilter=ie,Ai.wrapS=fe,Ai.wrapT=fe,Ai.generateMipmaps=!1,Ai.needsUpdate=!0),Ai}var Mi=class{constructor(e={}){let{canvas:r=m(),context:i=null,depth:a=!0,stencil:o=!1,alpha:c=!1,antialias:l=!1,premultipliedAlpha:u=!0,preserveDrawingBuffer:d=!1,powerPreference:p=`default`,failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:_=!1,outputBufferType:y=s}=e;this.isWebGLRenderer=!0;let b;if(i!==null){if(typeof WebGLRenderingContext<`u`&&i instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);b=i.getContextAttributes().alpha}else b=c;let C=y,T=new Set([re,t,Ce]),ee=new Set([s,Ee,D,Oe,S,w]),te=new Uint32Array(4),k=new Int32Array(4),ne={textures:[],min:[],max:[],resolution:[]},j=null,M=null,N=[],P=[],ie=null;this.domElement=r,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let I=this,ae=!1,R=null,z=null,oe=null,se=null;this._outputColorSpace=pe;let ce=0,le=0,V=null,ue=-1,de=null,fe=new x,me=new x,he=null,ge=new H(0),_e=0,ve=r.width,ye=r.height,be=1,xe=null,Se=null,U=new x(0,0,ve,ye),we=new x(0,0,ve,ye),De=!1,ke=new n,Ae=new Te,je=!1,Me=!1,W=new O,Ne=new g,Pe=new x,Fe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},G=!1;function Ie(){return V===null?be:1}let K=i;function Re(e,t){return r.getContext(e,t)}let ze,Be,q,J,Y,X,Ve,He,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,et,tt,nt,rt,it;try{let e={alpha:!0,depth:a,stencil:o,antialias:l,premultipliedAlpha:u,preserveDrawingBuffer:d,powerPreference:p,failIfMajorPerformanceCaveat:h};if(`setAttribute`in r&&r.setAttribute(`data-engine`,`three.js r187`),r.addEventListener(`webglcontextlost`,st,!1),r.addEventListener(`webglcontextrestored`,ct,!1),r.addEventListener(`webglcontextcreationerror`,lt,!1),K===null){let t=`webgl2`;if(K=Re(t,e),K===null)throw Re(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}at()}catch(e){throw r.removeEventListener(`webglcontextlost`,st,!1),r.removeEventListener(`webglcontextrestored`,ct,!1),r.removeEventListener(`webglcontextcreationerror`,lt,!1),F(`WebGLRenderer: `+e.message),e}function at(){ze=new Zt(K),ze.init(),nt=new bi(K,ze),Be=new jt(K,ze,e,nt),q=new vi(K,ze),Be.reversedDepthBuffer&&_&&q.buffers.depth.setReversed(!0),z=K.createFramebuffer(),oe=K.createFramebuffer(),se=K.createFramebuffer(),J=new en(K),Y=new Qr,X=new yi(K,ze,q,Y,Be,nt,J),Ve=new Xt(I),He=new Ct(K),rt=new kt(K,He),Ue=new Qt(K,He,J,rt),We=new nn(K,Ue,He,rt,J),Qe=new tn(K,Be,X),Ye=new Mt(Y),Ge=new Zr(I,Ve,ze,Be,rt,Ye),Ke=new Di(I,Y),qe=new ni,Je=new li(ze),Ze=new Ot(I,Ve,q,We,b,u),Xe=new _i(I,We,Be),it=new Oi(K,J,Be,q),et=new At(K,ze,J),tt=new $t(K,ze,J),J.programs=Ge.programs,I.capabilities=Be,I.extensions=ze,I.properties=Y,I.renderLists=qe,I.shadowMap=Xe,I.state=q,I.info=J}C!==1009&&(ie=new an(C,r.width,r.height,l,a,o));let ot=new wi(I,K);this.xr=ot,this.getContext=function(){return K},this.getContextAttributes=function(){return K.getContextAttributes()},this.forceContextLoss=function(){let e=ze.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=ze.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return be},this.setPixelRatio=function(e){e!==void 0&&(be=e,this.setSize(ve,ye,!1))},this.getSize=function(e){return e.set(ve,ye)},this.setSize=function(e,t,n=!0){ot.isPresenting?B(`WebGLRenderer: Can't change size while VR device is presenting.`):(ve=e,ye=t,r.width=Math.floor(e*be),r.height=Math.floor(t*be),n===!0&&(r.style.width=e+`px`,r.style.height=t+`px`),ie!==null&&ie.setSize(r.width,r.height),this.setViewport(0,0,e,t))},this.getDrawingBufferSize=function(e){return e.set(ve*be,ye*be).floor()},this.setDrawingBufferSize=function(e,t,n){ve=e,ye=t,be=n,r.width=Math.floor(e*n),r.height=Math.floor(t*n),this.setViewport(0,0,e,t)},this.setEffects=function(e){if(C===1009)F(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){B(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}ie.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(fe)},this.getViewport=function(e){return e.copy(U)},this.setViewport=function(e,t,n,r){e.isVector4?U.set(e.x,e.y,e.z,e.w):U.set(e,t,n,r),q.viewport(fe.copy(U).multiplyScalar(Ie()).round())},this.getScissor=function(e){return e.copy(we)},this.setScissor=function(e,t,n,r){e.isVector4?we.set(e.x,e.y,e.z,e.w):we.set(e,t,n,r),q.scissor(me.copy(we).multiplyScalar(Ie()).round())},this.getScissorTest=function(){return De},this.setScissorTest=function(e){q.setScissorTest(De=e)},this.setOpaqueSort=function(e){xe=e},this.setTransparentSort=function(e){Se=e},this.getClearColor=function(e){return e.copy(Ze.getClearColor())},this.setClearColor=function(){Ze.setClearColor(...arguments)},this.getClearAlpha=function(){return Ze.getClearAlpha()},this.setClearAlpha=function(){Ze.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(V!==null){let t=V.texture.format;e=T.has(t)}if(e){let e=V.texture.type,t=ee.has(e),n=Ze.getClearColor(),r=Ze.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(te[0]=i,te[1]=a,te[2]=o,te[3]=r,K.clearBufferuiv(K.COLOR,0,te)):(k[0]=i,k[1]=a,k[2]=o,k[3]=r,K.clearBufferiv(K.COLOR,0,k))}else r|=K.COLOR_BUFFER_BIT}t&&(r|=K.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=K.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&K.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),R=e},this.dispose=function(){r.removeEventListener(`webglcontextlost`,st,!1),r.removeEventListener(`webglcontextrestored`,ct,!1),r.removeEventListener(`webglcontextcreationerror`,lt,!1),Ze.dispose(),qe.dispose(),Je.dispose(),X.dispose(),Y.dispose(),Ve.dispose(),We.dispose(),Ue.dispose(),rt.dispose(),it.dispose(),Ge.dispose(),ot.dispose(),ot.removeEventListener(`sessionstart`,gt),ot.removeEventListener(`sessionend`,_t),vt.stop()};function st(e){e.preventDefault(),v(`WebGLRenderer: Context Lost.`),ae=!0}function ct(){v(`WebGLRenderer: Context Restored.`),ae=!1;let e=J.autoReset,t=Xe.enabled,n=Xe.autoUpdate,r=Xe.needsUpdate,i=Xe.type;at(),J.autoReset=e,Xe.enabled=t,Xe.autoUpdate=n,Xe.needsUpdate=r,Xe.type=i}function lt(e){F(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ut(e){let t=e.target;t.removeEventListener(`dispose`,ut),dt(t)}function dt(e){ft(e),Y.remove(e)}function ft(e){let t=Y.get(e).programs;t!==void 0&&(t.forEach(function(e){Ge.releaseProgram(e)}),e.isShaderMaterial&&Ge.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Fe);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Pt(e,t,n,r,i);q.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Ue.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;rt.setup(i,r,s,n,c);let h,g=et;if(c!==null&&(h=He.get(c),g=tt,g.setIndex(h)),i.isMesh)r.wireframe===!0?(q.setLineWidth(r.wireframeLinewidth*Ie()),g.setMode(K.LINES)):g.setMode(K.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),q.setLineWidth(e*Ie()),i.isLineSegments?g.setMode(K.LINES):i.isLineLoop?g.setMode(K.LINE_LOOP):g.setMode(K.LINE_STRIP)}else i.isPoints?g.setMode(K.POINTS):i.isSprite&&g.setMode(K.TRIANGLES);if(i.isBatchedMesh){if(ze.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?He.get(c).bytesPerElement:1,o=Y.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(K,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function pt(e,t,n,r){R!==null&&e.isNodeMaterial&&R.setObject(r,e),je===!0&&Ye.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,Tt(e,t,r),e.side=0,e.needsUpdate=!0,Tt(e,t,r),e.side=2):Tt(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),R!==null&&R.renderStart(e,t,n),M=Je.get(n),M.init(t),P.push(M),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),M.setupLights(),R!==null&&R.updateLights(M.state.lightsArray),Me=this.localClippingEnabled,je=Ye.init(this.clippingPlanes,Me),je===!0&&Ye.setGlobalState(this.clippingPlanes,t),R!==null&&Xe.render(M.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];pt(o,n,t,e),r.add(o)}else pt(i,n,t,e),r.add(i)}}),M=P.pop(),R!==null&&R.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=Y.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}ze.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let mt=null;function ht(e){mt&&mt(e)}function gt(){vt.stop()}function _t(){vt.start()}let vt=new St;vt.setAnimationLoop(ht),typeof self<`u`&&vt.setContext(self),this.setAnimationLoop=function(e){mt=e,ot.setAnimationLoop(e),e===null?vt.stop():vt.start()},ot.addEventListener(`sessionstart`,gt),ot.addEventListener(`sessionend`,_t),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){F(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(ae===!0)return;R!==null&&R.renderStart(e,t);let n=ot.enabled===!0&&ot.isPresenting===!0,r=ie!==null&&(V===null||n)&&ie.begin(I,V);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),ot.enabled===!0&&ot.isPresenting===!0&&(ie===null||ie.isCompositing()===!1)&&(ot.cameraAutoUpdate===!0&&ot.updateCamera(t),t=ot.getCamera()),e.isScene===!0&&e.onBeforeRender(I,e,t,V),M=Je.get(e,P.length),M.init(t),M.state.textureUnits=X.getTextureUnits(),P.push(M),W.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?Ae.setFromArrayCamera(t):ke.setFromProjectionMatrix(W,A,t.reversedDepth),Me=this.localClippingEnabled,je=Ye.init(this.clippingPlanes,Me),j=qe.get(e,N.length),j.init(),N.push(j),this.info.render.frame++,ot.enabled===!0&&ot.isPresenting===!0){let e=I.xr.getDepthSensingMesh();e!==null&&yt(e,t,-1/0,I.sortObjects)}yt(e,t,0,I.sortObjects),j.finish(),R!==null&&R.updateLights(M.state.lightsArray),I.sortObjects===!0&&j.sort(xe,Se),G=ot.enabled===!1||ot.isPresenting===!1||ot.hasDepthSensing()===!1,G&&Ze.addToRenderList(j,e),this.info.autoReset===!0&&this.info.reset(),je===!0&&Ye.beginShadows();let i=M.state.shadowsArray;if(Xe.render(i,e,t),je===!0&&Ye.endShadows(),(r&&ie.hasRenderPass())===!1){let n=j.opaque,r=j.transmissive;if(M.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];xt(n,r,e,a)}G&&Ze.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];bt(j,e,n,n.viewport)}}else r.length>0&&xt(n,r,e,t),G&&Ze.render(e),bt(j,e,t)}V!==null&&le===0&&(X.updateMultisampleRenderTarget(V),X.updateRenderTargetMipmap(V)),r&&ie.end(I),e.isScene===!0&&e.onAfterRender(I,e,t),rt.resetDefaultState(),ue=-1,de=null,P.pop(),P.length>0?(M=P[P.length-1],X.setTextureUnits(M.state.textureUnits),je===!0&&Ye.setGlobalState(I.clippingPlanes,M.state.camera)):M=null,N.pop(),j=N.length>0?N[N.length-1]:null,R!==null&&R.renderEnd()};function yt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)M.pushLight(e),e.castShadow&&M.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?Ae:ke;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&Pe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(W);let i=We.update(e),a=e.material;a.visible&&j.push(e,i,a,n,Pe.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?Ae:ke;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=We.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),Pe.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Pe.copy(e.boundingSphere.center)),Pe.applyMatrix4(e.matrixWorld).applyMatrix4(W)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&j.push(e,i,c,n,Pe.z,s,t)}}else a.visible&&j.push(e,i,a,n,Pe.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)yt(i[e],t,n,r)}function bt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;M.setupLightsView(n),je===!0&&Ye.setGlobalState(I.clippingPlanes,n),r&&q.viewport(fe.copy(r)),i.length>0&&Z(i,t,n),a.length>0&&Z(a,t,n),o.length>0&&Z(o,t,n),q.buffers.depth.setTest(!0),q.buffers.depth.setMask(!0),q.buffers.color.setMask(!0),q.setPolygonOffset(!1)}function xt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[r.id]===void 0){let e=ze.has(`EXT_color_buffer_half_float`)||ze.has(`EXT_color_buffer_float`);M.state.transmissionRenderTarget[r.id]=new $e(1,1,{generateMipmaps:!0,type:e?E:s,minFilter:f,samples:Math.max(4,Be.samples),stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Le.workingColorSpace})}let i=M.state.transmissionRenderTarget[r.id],a=r.viewport||fe;i.setSize(a.z*I.transmissionResolutionScale,a.w*I.transmissionResolutionScale);let c=I.getRenderTarget(),l=I.getActiveCubeFace(),u=I.getActiveMipmapLevel();I.setRenderTarget(i),I.getClearColor(ge),_e=I.getClearAlpha(),_e<1&&I.setClearColor(16777215,.5),I.clear(),G&&Ze.render(n);let d=I.toneMapping;I.toneMapping=0;let p=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),M.setupLightsView(r),je===!0&&Ye.setGlobalState(I.clippingPlanes,r),Z(e,n,r),X.updateMultisampleRenderTarget(i),X.updateRenderTargetMipmap(i),ze.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Q(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(X.updateMultisampleRenderTarget(i),X.updateRenderTargetMipmap(i))}I.setRenderTarget(c,l,u),I.setClearColor(ge,_e),p!==void 0&&(r.viewport=p),I.toneMapping=d}function Z(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Q(o,t,n,s,l,c)}}function Q(e,t,n,r,i,a){R!==null&&i.isNodeMaterial&&R.setObject(e,i),e.onBeforeRender(I,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(I,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,I.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,I.renderBufferDirect(n,t,r,i,e,a),i.side=2):I.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(I,t,n,r,i,a)}function wt(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function Tt(e,t,n){t.isScene!==!0&&(t=Fe);let r=Y.get(e),i=M.state.lights,a=M.state.shadowsArray,o=i.state.version,s=Ge.getParameters(e,i.state,a,t,n,M.state.lightProbeGridArray),c=Ge.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Ve.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ut),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Nt(e,s),d}else s.uniforms=Ge.getUniforms(e),R!==null&&e.isNodeMaterial&&R.build(e,n,s),e.onBeforeCompile(s,I),d=Ge.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ye.uniform),Nt(e,s),r.needsLights=It(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=wt(M.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function Et(e,t,n,r,i){let a=Y.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=Tt(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function Dt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=mr.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Nt(e,t){let n=Y.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Pt(e,t,n,r,i){t.isScene!==!0&&(t=Fe),X.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=V===null?I.outputColorSpace:V.isXRRenderTarget===!0?V.texture.colorSpace:Le.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Ve.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(V===null||V.isXRRenderTarget===!0)&&(h=I.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=Y.get(r),y=M.state.lights;if(je===!0&&(Me===!0||e!==de)){let t=e===de&&r.id===ue;Ye.setState(r,e,t)}let b=!1,x=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ye.numPlanes||v.numIntersection!==Ye.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===wt(M.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(x=!0):b=!0:b=!0:(b=!0,v.__version=r.version);let S=v.currentProgram;(b===!0||x===!0)&&(S=x===!0?Et(r,t,i,s,h):Tt(r,t,i),R&&r.isNodeMaterial&&R.onUpdateProgram(r,S,v));let C=!1,w=!1,T=!1,E=S.getUniforms(),D=v.uniforms;if(q.useProgram(S.program)&&(C=!0,w=!0,T=!0),r.id!==ue&&(ue=r.id,w=!0),C||de!==e){q.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),E.setValue(K,`projectionMatrix`,e.projectionMatrix),E.setValue(K,`viewMatrix`,e.matrixWorldInverse);let t=E.map.cameraPosition;t!==void 0&&t.setValue(K,Ne.setFromMatrixPosition(e.matrixWorld)),Be.logarithmicDepthBuffer&&E.setValue(K,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&E.setValue(K,`isOrthographic`,e.isOrthographicCamera===!0),de!==e&&(de=e,w=!0,T=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&E.setValue(K,`sunShadowMap`,y.state.sunShadowMap,X),y.state.directionalShadowMap.length>0&&E.setValue(K,`directionalShadowMap`,y.state.directionalShadowMap,X),y.state.spotShadowMap.length>0&&E.setValue(K,`spotShadowMap`,y.state.spotShadowMap,X),y.state.pointShadowMap.length>0&&E.setValue(K,`pointShadowMap`,y.state.pointShadowMap,X)),i.isSkinnedMesh){E.setOptional(K,i,`bindMatrix`),E.setOptional(K,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),E.setValue(K,`boneTexture`,e.boneTexture,X))}i.isBatchedMesh&&(E.setOptional(K,i,`batchingTexture`),E.setValue(K,`batchingTexture`,i._matricesTexture,X),E.setOptional(K,i,`batchingIdTexture`),E.setValue(K,`batchingIdTexture`,i._indirectTexture,X),E.setOptional(K,i,`batchingColorTexture`),i._colorsTexture!==null&&E.setValue(K,`batchingColorTexture`,i._colorsTexture,X));let O=n.morphAttributes;if((O.position!==void 0||O.normal!==void 0||O.color!==void 0)&&Qe.update(i,n,S),(w||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,E.setValue(K,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(D.envMapIntensity.value=t.environmentIntensity),D.dfgLUT!==void 0&&(D.dfgLUT.value=ji()),w){if(E.setValue(K,`toneMappingExposure`,I.toneMappingExposure),v.needsLights&&Ft(D,T),a&&r.fog===!0&&Ke.refreshFogUniforms(D,a),Ke.refreshMaterialUniforms(D,r,be,ye,M.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=ne,t=0;for(let n of M.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;D.probesSH.value=e.textures,D.probesMin.value=e.min,D.probesMax.value=e.max,D.probesResolution.value=e.resolution}mr.upload(K,Dt(v),D,X)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(mr.upload(K,Dt(v),D,X),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&E.setValue(K,`center`,i.center),E.setValue(K,`modelViewMatrix`,i.modelViewMatrix),E.setValue(K,`normalMatrix`,i.normalMatrix),E.setValue(K,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];it.update(n,S),it.bind(n,S)}}return S}function Ft(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function It(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return ce},this.getActiveMipmapLevel=function(){return le},this.getRenderTarget=function(){return V},this.setRenderTargetTextures=function(e,t,n){let r=Y.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),Y.get(e.texture).__webglTexture=t,Y.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=Y.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){V=e,ce=t,le=n;let r=null,i=!1,a=!1;if(e){let o=Y.get(e);if(o.__useDefaultFramebuffer!==void 0){q.bindFramebuffer(K.FRAMEBUFFER,o.__webglFramebuffer),fe.copy(e.viewport),me.copy(e.scissor),he=e.scissorTest,q.viewport(fe),q.scissor(me),q.setScissorTest(he),ue=-1;return}if(o.__webglFramebuffer===void 0)X.setupRenderTarget(e);else if(o.__hasExternalTextures)X.rebindTextures(e,Y.get(e.texture).__webglTexture,Y.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&Y.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);X.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=Y.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&X.useMultisampledRTT(e)===!1?Y.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,fe.copy(e.viewport),me.copy(e.scissor),he=e.scissorTest}else fe.copy(U).multiplyScalar(be).floor(),me.copy(we).multiplyScalar(be).floor(),he=De;if(n!==0&&(r=z),q.bindFramebuffer(K.FRAMEBUFFER,r)&&q.drawBuffers(e,r),q.viewport(fe),q.scissor(me),q.setScissorTest(he),i){let r=Y.get(e.texture);K.framebufferTexture2D(K.FRAMEBUFFER,K.COLOR_ATTACHMENT0,K.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=Y.get(e.textures[t]);K.framebufferTextureLayer(K.FRAMEBUFFER,K.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=Y.get(e.texture);K.framebufferTexture2D(K.FRAMEBUFFER,K.COLOR_ATTACHMENT0,K.TEXTURE_2D,t.__webglTexture,n)}ue=-1};function Lt(e){let t=Y.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Be.textureFormatReadable(e.format),t.__typeReadable=Be.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=Y.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){q.bindFramebuffer(K.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&K.readBuffer(K.COLOR_ATTACHMENT0+s);let u=Lt(o);if(u.__formatReadable===!1){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&K.readPixels(t,n,r,i,nt.convert(c),nt.convert(l),a)}finally{let e=V===null?null:Y.get(V).__webglFramebuffer;q.bindFramebuffer(K.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=Y.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){q.bindFramebuffer(K.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&K.readBuffer(K.COLOR_ATTACHMENT0+s);let d=Lt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=K.createBuffer();K.bindBuffer(K.PIXEL_PACK_BUFFER,f),K.bufferData(K.PIXEL_PACK_BUFFER,a.byteLength,K.STREAM_READ),K.readPixels(t,n,r,i,nt.convert(l),nt.convert(u),0),K.bindBuffer(K.PIXEL_PACK_BUFFER,null);let p=V===null?null:Y.get(V).__webglFramebuffer;q.bindFramebuffer(K.FRAMEBUFFER,p);let m=K.fenceSync(K.SYNC_GPU_COMMANDS_COMPLETE,0);return K.flush(),await L(K,m,4),K.bindBuffer(K.PIXEL_PACK_BUFFER,f),K.getBufferSubData(K.PIXEL_PACK_BUFFER,0,a),K.bindBuffer(K.PIXEL_PACK_BUFFER,null),K.deleteBuffer(f),K.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;X.setTexture2D(e,0),K.copyTexSubImage2D(K.TEXTURE_2D,n,0,0,o,s,i,a),q.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=nt.convert(t.format),_=nt.convert(t.type),v;t.isData3DTexture?(X.setTexture3D(t,0),v=K.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(X.setTexture2DArray(t,0),v=K.TEXTURE_2D_ARRAY):(X.setTexture2D(t,0),v=K.TEXTURE_2D),q.activeTexture(K.TEXTURE0),q.pixelStorei(K.UNPACK_FLIP_Y_WEBGL,t.flipY),q.pixelStorei(K.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),q.pixelStorei(K.UNPACK_ALIGNMENT,t.unpackAlignment);let y=q.getParameter(K.UNPACK_ROW_LENGTH),b=q.getParameter(K.UNPACK_IMAGE_HEIGHT),x=q.getParameter(K.UNPACK_SKIP_PIXELS),S=q.getParameter(K.UNPACK_SKIP_ROWS),C=q.getParameter(K.UNPACK_SKIP_IMAGES);q.pixelStorei(K.UNPACK_ROW_LENGTH,h.width),q.pixelStorei(K.UNPACK_IMAGE_HEIGHT,h.height),q.pixelStorei(K.UNPACK_SKIP_PIXELS,l),q.pixelStorei(K.UNPACK_SKIP_ROWS,u),q.pixelStorei(K.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=Y.get(e),r=Y.get(t),h=Y.get(n.__renderTarget),g=Y.get(r.__renderTarget);q.bindFramebuffer(K.READ_FRAMEBUFFER,h.__webglFramebuffer),q.bindFramebuffer(K.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(K.framebufferTextureLayer(K.READ_FRAMEBUFFER,K.COLOR_ATTACHMENT0,Y.get(e).__webglTexture,i,d+n),K.framebufferTextureLayer(K.DRAW_FRAMEBUFFER,K.COLOR_ATTACHMENT0,Y.get(t).__webglTexture,a,m+n)),K.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,K.DEPTH_BUFFER_BIT,K.NEAREST);q.bindFramebuffer(K.READ_FRAMEBUFFER,null),q.bindFramebuffer(K.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||Y.has(e)){let n=Y.get(e),r=Y.get(t);q.bindFramebuffer(K.READ_FRAMEBUFFER,oe),q.bindFramebuffer(K.DRAW_FRAMEBUFFER,se);for(let e=0;e<c;e++)w?K.framebufferTextureLayer(K.READ_FRAMEBUFFER,K.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):K.framebufferTexture2D(K.READ_FRAMEBUFFER,K.COLOR_ATTACHMENT0,K.TEXTURE_2D,n.__webglTexture,i),T?K.framebufferTextureLayer(K.DRAW_FRAMEBUFFER,K.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):K.framebufferTexture2D(K.DRAW_FRAMEBUFFER,K.COLOR_ATTACHMENT0,K.TEXTURE_2D,r.__webglTexture,a),i===0?T?K.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):K.copyTexSubImage2D(v,a,f,p,l,u,o,s):K.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,K.COLOR_BUFFER_BIT,K.NEAREST);q.bindFramebuffer(K.READ_FRAMEBUFFER,null),q.bindFramebuffer(K.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?K.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?K.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):K.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?K.texSubImage2D(K.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?K.compressedTexSubImage2D(K.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):K.texSubImage2D(K.TEXTURE_2D,a,f,p,o,s,g,_,h);q.pixelStorei(K.UNPACK_ROW_LENGTH,y),q.pixelStorei(K.UNPACK_IMAGE_HEIGHT,b),q.pixelStorei(K.UNPACK_SKIP_PIXELS,x),q.pixelStorei(K.UNPACK_SKIP_ROWS,S),q.pixelStorei(K.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&K.generateMipmap(v),q.unbindTexture()},this.initRenderTarget=function(e){Y.get(e).__webglFramebuffer===void 0&&X.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?X.setTextureCube(e,0):e.isData3DTexture?X.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?X.setTexture2DArray(e,0):X.setTexture2D(e,0),q.unbindTexture()},this.resetState=function(){ce=0,le=0,V=null,q.reset(),rt.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return A}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Le._getDrawingBufferColorSpace(e),t.unpackColorSpace=Le._getUnpackColorSpace()}};function Ni([e,t,n]){let r=(e+16)/116,i=e=>e**3>.008856?e**3:(e-16/116)/7.787,a=.95047*i(r+t/500),o=i(r),s=1.08883*i(r-n/200),c=[3.2404542*a-1.5371385*o-.4985314*s,-.969266*a+1.8760108*o+.041556*s,.0556434*a-.2040259*o+1.0572252*s].map(e=>Math.round(255*Math.max(0,Math.min(1,e<=.0031308?12.92*e:1.055*e**(1/2.4)-.055))));return c[0]<<16|c[1]<<8|c[2]}function Pi(e){let[t,n,r]=[e>>16&255,e>>8&255,e&255].map(e=>{let t=e/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4}),i=e=>e>.008856?Math.cbrt(e):7.787*e+16/116,a=i((.4124564*t+.3575761*n+.1804375*r)/.95047),o=i(.2126729*t+.7151522*n+.072175*r),s=i((.0193339*t+.119192*n+.9503041*r)/1.08883);return{L:116*o-16,a:500*(a-o),b:200*(o-s),chroma:Math.hypot(500*(a-o),200*(o-s))}}var Fi=[[49,1,10],[52.4,.6,4.5],[48,.9,7],[44,1.3,9],[38,.8,5.5],[42,1.4,8],[37,.9,6]],Ii={pale:[44,1.4,9],grey:[38,.6,3.5]},Li=Object.freeze({clay:{id:`clay`,name:`Neutral clay`,layers:[12893614,10985618,11905946,8683123,10787465,7761764,9537399],soil:12498856,brick:11642772,ring:11049862,stone:10327947,damp:7761764},photo:{id:`photo`,name:`Photo-informed soil and terracotta`,layers:Fi.map(Ni),soil:Ni(Fi[0]),brick:Ni([47,7,12]),ring:10127217,stone:Ni([54,1,5]),damp:Ni([43,1.2,7]),lime:Ni([63,2,9]),burnt:6443588,plinth:2434338,mud:Ni([40,1.2,6]),sherd:Ni([60,2,6]),basal:{pale:Ni(Ii.pale),grey:Ni(Ii.grey)}}});function Ri(e){return()=>{let t=e+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}var zi=(e,t,n)=>e+(t-e)*n;function Bi(e,t=0,n=0,r=411){let i=Math.floor(e),a=Math.floor(t),o=Math.floor(n),s=[e-i,t-a,n-o],c=s.map(e=>e**3*(e*(e*6-15)+10)),l=(e,t,n)=>{let c=Math.imul(i+e,374761393)^Math.imul(a+t,668265263)^Math.imul(o+n,2147483647)^r;c=Math.imul(c^c>>>13,1274126177),c^=c>>>16;let l=(c>>>0)/4294967296*Math.PI*2,u=(c>>>8&65535)/32767.5-1,d=Math.sqrt(1-u*u);return d*Math.cos(l)*(s[0]-e)+u*(s[1]-t)+d*Math.sin(l)*(s[2]-n)};return zi(zi(zi(l(0,0,0),l(1,0,0),c[0]),zi(l(0,1,0),l(1,1,0),c[0]),c[1]),zi(zi(l(0,0,1),l(1,0,1),c[0]),zi(l(0,1,1),l(1,1,1),c[0]),c[1]),c[2])*1.7}function Vi(e,t,n,r,i){let a=Ri(r),o=Math.hypot(n[0]-t[0],n[1]-t[1]);return{id:e,from:t,to:n,length:o,seed:r,bites:Array.from({length:i},(e,t)=>({at:o*((t+.6+a()*.3)/i),radius:.2+a()*.2,depth:.2+a()*.2}))}}var Hi=[Vi(`front`,[-12,8],[12,8],5181,3),Vi(`right`,[12,8],[12,-8],5182,2),Vi(`back`,[12,-8],[-12,-8],5183,3),Vi(`left`,[-12,-8],[-12,8],5184,2)],Ui=Array.from({length:4},(e,t)=>{let n=-10+t*5;return[Vi(`lip-${t}-left`,[n,8],[n,4],5300+t*3,2),Vi(`lip-${t}-back`,[n,4],[n+4,4],5301+t*3,2),Vi(`lip-${t}-right`,[n+4,4],[n+4,8],5302+t*3,2)]}).flat();function Wi(e,t){return .09+.055*Bi(t*2.9,.37,.73,e.seed)+e.bites.reduce((e,n)=>e+n.depth*Math.exp(-(((t-n.at)/n.radius)**2)),0)}function Gi(e,t,n){let r=.04+.06*(.5+.5*Bi(t/.23,.91,.17,e.seed+7));if(n>=r)return 0;let i=Math.max(0,Bi(t/.11,.29,.61,e.seed+11))*.045+Math.abs(Bi(t/.045,.53,.37,e.seed+13))*.018+Math.abs(Bi(t/.02,.71,.83,e.seed+17))*.007,a=1-n/r;return(i+.004)*a*Math.sqrt(a)}function Ki(e,t){let n=0;for(let r of[...Hi,...Ui]){let i=r.to[0]-r.from[0],a=r.to[1]-r.from[1],o=((e-r.from[0])*i+(t-r.from[1])*a)/r.length;if(o<-.2||o>r.length+.2)continue;let s=Math.max(0,Math.min(r.length,o)),c=Math.hypot(e-r.from[0]-i*s/r.length,t-r.from[1]-a*s/r.length);if(c>=.35)continue;let l=(1-c/.35)**2.2;n+=Wi(r,s)*l+Gi(r,s,c)}return n}Object.freeze({reachMetres:.14,baseMetres:.035,noiseMetres:.02,biteScale:.35,falloffPower:1.6});var qi=Object.freeze([{name:`loose fill, grey ash streaks`,mottle:1.1,streak:1,streakThickness:.09,lump:.35,lumpPeriod:.08,speck:.14,patches:.12,ash:.55,relief:1},{name:`loose grey earth, lime flecks`,mottle:1.3,streak:.3,streakThickness:.07,lump:.3,lumpPeriod:.07,speck:.2,patches:.1,relief:.9},{name:`compact sealing earth`,mottle:.9,streak:.8,streakThickness:.12,lump:.25,lumpPeriod:.1,speck:.08,patches:.08,relief:.6},{name:`occupation earth, pottery and brick fragments`,mottle:1.25,streak:.6,streakThickness:.1,lump:.7,lumpPeriod:.09,speck:.14,patches:.15,relief:1.3},{name:`darker occupation earth, burnt patches`,mottle:1.2,streak:.55,streakThickness:.08,lump:.55,lumpPeriod:.08,speck:.2,patches:.14,burnt:.35,relief:1.1},{name:`compact occupation earth, rubble and brick-bats; compact = fewer voids and finer grain, not smooth`,mottle:1.3,streak:.9,streakThickness:.09,lump:.6,lumpPeriod:.08,speck:.3,patches:.14,relief:1.3},{name:`thin pale-yellow and greyish beds`,mottle:.85,streak:.5,streakThickness:.07,lump:.3,lumpPeriod:.07,speck:.18,patches:.05,beds:1,relief:.7}].map(Object.freeze)),Ji=Object.freeze([{densityPerSquareMetre:6,diameterMetres:[.01,.06],mix:{brickbat:.7,ash:.3}},{densityPerSquareMetre:30,diameterMetres:[.005,.03],mix:{lime:1}},null,{densityPerSquareMetre:30,diameterMetres:[.01,.12],mix:{brickbat:.55,sherd:.45},clusterShare:.4},{densityPerSquareMetre:10,diameterMetres:[.01,.05],mix:{charcoal:.8,brickbat:.2}},{densityPerSquareMetre:25,diameterMetres:[.02,.15],mix:{brickbat:.5,rubble:.35,mudbrick:.15},clusterShare:.4},{densityPerSquareMetre:6,diameterMetres:[.01,.05],mix:{sherd:1}}]),Yi=Array.from({length:4},(e,t)=>({id:`square-${t+1}`,xmin:-10+t*5,xmax:-6+t*5,zmin:4,zmax:8,depth:2.4+t*1.45}));function Xi(e,t=0){let n=.025*Bi(e*2.1+t*.7,t*1.7-e*.4,.31,17751)+.012*Bi(e*4.3-t*1.1,t*3.2+e*.7,.57,17752),r=n>0?n*.3:n;return 2.5-e*5/48-t*5/32+r-Ki(e,t)}Object.freeze({trenchBatterDegrees:[2.5,4.5],pitBatterDegrees:[2,3],rampMetres:.6,pitRampMetres:.2,pitRimCrumbleMetres:[.01,.06],pitRimReachMetres:.1,seed:18401});var Zi=e=>e.depth-Xi((e.xmin+e.xmax)/2,(e.zmin+e.zmax)/2),Qi=7,$i=7.525,ea=Xi(Qi,$i)+Zi(Yi[3]),ta=ea+2.2-Xi(Qi,$i),na=ta+1.5,ra={id:`well-pit`,kind:`rectangle`,xmin:6.475,xmax:7.525,zmin:7,zmax:8,topDepth:ea-Xi(Qi,$i),bottomDepth:ta+.12};Object.freeze({width:24,length:16,depth:na+Xi(-12,-8),bottomDepth:na,fadeStartDepth:ta,shaderFadeStartDepth:ta+.6,slopeRise:5,baulkWidth:1,trenches:Yi,shaft:{id:`ring-cut`,kind:`shaft`,x:Qi,z:$i,radius:.525,pit:ra,ringRadius:.35,localTopDepth:ea,localBottomDepth:ea+2.2,rings:18,ringHeight:.15,span:2.2,visiblePitch:(2.2-.15)/17,innerRadius:.31,wallThickness:.04,offsetsMetres:.01,tiltRadians:.012,crackedCourses:[0,3,11],sourceId:`P1:p357`,modellingAssumption:`18 nested 0.15m rings span 2.20m: (2.20−0.15)/17 visible pitch. Ring diameter 0.70m includes lips. Wall thickness 0.04m, rectangular excavation 1.05m wide, front setback0.125m, 0.01m offsets, tilts up to0.012rad, chipped/cracked courses, loose fragment, top-only flush fill and placement are assumptions; source wall thickness unknown. Exposed convex-column treatment follows Fig.7 photo observation.`},features:[{id:`wall-1`,kind:`rectangle`,xmin:-11.8,xmax:-10.2,zmin:6,zmax:8,topDepth:1.1,bottomDepth:1.85,material:`brick`},{id:`wall-2`,kind:`rectangle`,xmin:4.08,xmax:4.92,zmin:5.4,zmax:8,topDepth:3.4,bottomDepth:4.15,material:`brick`},{id:`floor-1`,kind:`rectangle`,xmin:-12,xmax:8.8,zmin:4,zmax:8,topDepth:2.2,bottomDepth:2.275,material:`lime`,breaks:[[-8.95,-8.5],[4.3,4.62]]}]});function ia(e,t,n,r,i,a){let o=new se(e,t,n),s=o.toNonIndexed().translate(r,i,a);return o.dispose(),s}var aa=Object.freeze([20,34,44]);(([e,,t])=>[e/Math.hypot(e,t),0,t/Math.hypot(e,t)])(aa);var oa=.6,sa={ash:[[56,.5,1.5]],lime:[[64,.8,3.5]],charcoal:[[17,1,2],[22,1.5,3]],rubble:[[52,1,4],[45,.8,3]],mudbrick:[[44,5,9]],sherd:[[42,7,10],[36,.5,1.5],[26,.5,1],[48,.8,2.5]]},ca=Object.freeze({flatKinds:[`brickbat`,`sherd`,`lime`,`ash`,`charcoal`],flatTiltDegrees:18,roundTiltDegrees:35,piecesPerCluster:6,clusterLengthMetres:[.3,.8],featherMetres:.0035,hostFilm:[.12,.25],dust:[.25,.6],litEdge:.18,shadowEdge:.2,valueSpreadL:11,sides:[5,9],angleJitter:.32,radius:[.5,1],buriedShare:.35,buriedArcDegrees:[50,110],buriedDepth:[.35,.7],limeAspect:[1.1,2]});function la(e,t,n){let r=e===`brickbat`?[Pi(n.brick)].map(e=>[e.L,e.a,e.b]).flatMap(e=>[e,[e[0]-6,e[1]*.9,e[2]*.85],[e[0]+4,e[1]*.85,e[2]]]):sa[e],i=r[Math.floor(t()*r.length)],a=.8+t()*.4;return[Math.max(8,i[0]+(t()*2-1)*ca.valueSpreadL),i[1]*a,i[2]*a]}Object.freeze([{id:`pre-mauryan`,name:`Pre-Mauryan`,dates:`540–323 BCE`,start:-539,end:-322},{id:`mauryan`,name:`Mauryan`,dates:`323–200 BCE`,start:-322,end:-199},{id:`sunga`,name:`Sunga`,dates:`200 BCE – 1 CE`,start:-199,end:1},{id:`kushan`,name:`Kushan`,dates:`1–200 CE`,start:1,end:200},{id:`gupta`,name:`Gupta`,dates:`200–400 CE`,start:200,end:400},{id:`post-gupta`,name:`Post-Gupta`,dates:`400–600 CE`,start:400,end:600},{id:`rajput`,name:`Rajput`,dates:`600–1200 CE`,start:600,end:1200},{id:`sultanate`,name:`Sultanate`,dates:`1200–1500 CE`,start:1200,end:1500},{id:`mughal`,name:`Mughal`,dates:`1600–1800 CE`,start:1600,end:1800}]);async function ua(){let e=[...[`Strata Inter`,`Strata Serif`,`Strata Sans`,`Strata Sans Numerals`].map(e=>[600,e]),[400,`Strata Sans`],[400,`Strata Sans Numerals`]];for(let[t,n]of e){let e=await document.fonts.load(`${t} 64px "${n}"`);if(!e.length||e.some(e=>e.status!==`loaded`||String(e.weight)!==String(t)))throw Error(`Bundled ${n} ${t} failed to load; film fallback is forbidden`)}}var da=7;Object.freeze([Object.freeze([2,`0`]),Object.freeze([7,`5 m`])]);var fa=Object.freeze({family:`Strata Sans`,numeralFamily:`Strata Sans Numerals`,weight:600,capHeightPx1080:15,gapPx1080:da,fill:`#eee4d2`,haloBlurPx1080:28,haloColor:`rgba(12,13,13,.95)`,haloOffsetYPx1080:1}),pa=Object.freeze([`pre-mauryan`,`mauryan`,`sunga`,`kushan`,`gupta`,`post-gupta`,`rajput`,`sultanate`,`mughal`,`modern-fill`]);Object.freeze({"modern-fill":{T:.95,s:-.15},mughal:{T:.75,s:-.15},sultanate:{T:.8,s:.25},rajput:{T:1.1,s:.25},"post-gupta":{T:.75,s:.2},gupta:{T:.75,s:.2},kushan:{T:1.1,s:.25},sunga:{T:.8,s:.25},mauryan:{T:1,s:0},"pre-mauryan":{T:1.4,s:0}}),Object.freeze({shownMetres:.6,fadeMetres:.6});var ma=Object.freeze({amplitudesMetres:[.025,.015],truncationMetres:.002}),ha=pa.length+1,ga=e=>e.map(e=>e<0?0:e>1?1:e);new Float64Array(ha),Object.freeze({xmin:-12,zmin:-8,width:24,length:16,stepMetres:.05});function _a(e,t,n=new Float32Array(e.nx*e.nz)){let r=e.grids;n.set(r[0]);for(let e=0;e<pa.length;e++){let i=Math.max(0,Math.min(1,t[e]??0));if(i===0)continue;let a=r[e+1],o=r[e];for(let e=0;e<n.length;e++)n[e]+=i*(a[e]-o[e])}return n}function va(e,t,n,r){let i=Math.max(0,Math.min(e.nx-1,(n-e.xmin)/e.stepMetres)),a=Math.max(0,Math.min(e.nz-1,(r-e.zmin)/e.stepMetres)),o=Math.min(e.nx-2,Math.floor(i)),s=Math.min(e.nz-2,Math.floor(a)),c=i-o,l=a-s,u=s*e.nx+o;return(t[u]*(1-c)+t[u+1]*c)*(1-l)+(t[u+e.nx]*(1-c)+t[u+e.nx+1]*c)*l}function ya(e){for(let t=pa.length-1;t>=0;t--)if((e[t]??0)>0)return t;return-1}Object.freeze([{id:`square-1`,xmin:-10,xmax:-6,zmin:4,zmax:8},{id:`square-2`,xmin:-5,xmax:-1,zmin:4,zmax:8},{id:`square-3`,xmin:0,xmax:4,zmin:4,zmax:8},{id:`square-4`,xmin:5,xmax:9,zmin:4,zmax:8}].map(Object.freeze)),Object.freeze([-2.6,-4.1]),Object.freeze([{id:`modern-brick-1948`,era:`modern-fill`,rule:`find`,centre:[10.6,8]},{id:`modern-china-1955`,era:`modern-fill`,rule:`find`,centre:[-11,8]},{id:`mughal-porcelain`,era:`mughal`,rule:`find`,centre:[-.52,8]},{id:`mughal-glass`,era:`mughal`,rule:`find`,centre:[-5.52,8]},{id:`sultanate-corner`,era:`sultanate`,rule:`wall`,centre:[-2.725,3.8]},{id:`sultanate-lime-floor`,part:`A`,era:`sultanate`,rule:`surface`,centre:[-3.1,4.17]},{id:`sultanate-lime-floor`,part:`B`,era:`sultanate`,rule:`surface`,centre:[1.8,3.9]},{id:`rajput-wall`,era:`rajput`,rule:`wall`,centre:[-8.7,5.5],floorOf:`square-1`},{id:`rajput-postholes`,era:`rajput`,rule:`opening`,host:`top`,centre:[-7.9,3.85],postholeClearance:.1},{id:`rajput-rubble`,era:`rajput`,rule:`wall`,centre:[-11.225,7],rotate:90},{id:`rajput-pottery-dump`,era:`rajput`,rule:`bed`,centre:[-10,7.7],rotate:90,optional:!0,aboveFloor:{trench:`square-1`,clearance:.1}},{id:`rajput-sealed-pit`,era:`rajput`,rule:`opening`,host:`base`,centre:[-5.5,7.8],overrides:{base:0,width:.8},intoGupta:.15,optional:!0},{id:`post-gupta-wall-ns`,era:`post-gupta`,rule:`wall`,centre:[-.5,7.08]},{id:`post-gupta-wall-ew`,era:`post-gupta`,rule:`wall`,centre:[-4.65,5.6]},{id:`gupta-floor`,part:`A`,era:`gupta`,rule:`surface`,centre:[-3.5,6.65],floorOf:`square-2`},{id:`gupta-floor`,part:`B`,era:`gupta`,rule:`surface`,centre:[-1.75,3.9],rotate:90,floorOf:`square-2`},{id:`gupta-brickbat-wall`,era:`gupta`,rule:`wall`,centre:[-3.5,4.825],floorOf:`square-2`},{id:`kushan-house`,era:`kushan`,rule:`wall`,fig13:!0,floorOf:`square-3`},{id:`pillar-base-as-drawn`,era:`kushan`,rule:`wall`,fig13:!0},{id:`top-left-stone-as-drawn`,era:`kushan`,rule:`wall`,fig13:!0},{id:`kushan-bricks`,era:`kushan`,rule:`wall`,centre:[11.225,6.8],rotate:90},{id:`sunga-masonry`,era:`sunga`,rule:`wall`,centre:[7.75,4.3],rotate:90},{id:`sunga-burnt-patches`,part:`at masonry`,era:`sunga`,rule:`surface`,centre:[6.95,2.25]},{id:`sunga-burnt-patches`,part:`isolated 1`,era:`sunga`,rule:`surface`,centre:[-3.05,-4.15]},{id:`sunga-burnt-patches`,part:`isolated 2`,era:`sunga`,rule:`surface`,centre:[-10.9,7.33]},{id:`sunga-kushan-lane`,era:`sunga`,rule:`surface`,centre:[9.9,6.9],rotate:90},{id:`mauryan-drain`,era:`mauryan`,rule:`surface`,centre:[7,6.4],overrides:{polyline:[[0,0],[4.8,0]]},floorOf:`square-4`,flush:!0,channel:{halfWidthMetres:.16,floorMetres:-.008}},{id:`pre-mauryan-sherds`,era:`pre-mauryan`,rule:`find`,centre:[2,8]}].map(Object.freeze));var ba=Object.freeze({id:`mauryan-ring-well`,era:`mauryan`,x:7,z:7.525,radius:.35,span:2.2,floorOf:`square-4`,pit:{xmin:6.475,xmax:7.525,zmin:7,zmax:8,belowRings:.12}});Object.freeze({id:`controlled-pit`,xmin:7.2,xmax:8.4,zmin:4.55,zmax:6.05,steps:2,stepInset:.2,inside:`square-4`});var xa=(()=>{let e=41.5*Math.PI/180,t=28*Math.PI/180;return[Math.cos(t)*Math.sin(e),Math.sin(t),Math.cos(t)*Math.cos(e)]})();Object.freeze(xa);var Sa=.01,Ca=Object.freeze([0,.25,.5,.75,1].map(e=>{let t=(35+13*e)*Math.PI/180,n=(27+2*e)*Math.PI/180,r=72.5;return Object.freeze([-1.4+r*Math.cos(n)*Math.sin(t),-3.85-.95*e+r*Math.sin(n),r*Math.cos(n)*Math.cos(t)])})),wa=e=>Math.round(e*1e6)/1e6,Ta=e=>e&&e.map(wa);function Ea({items:e,soilAt:t,stack:n,activeTop:r,block:i,meshOccludes:a=(e,t)=>t.intersectObject(e,!1).length>0,cacheCandidates:o=!1}){let s=Ca.map(e=>new g(...e)),c=new WeakMap;function l(e){let t=e.handle.object.children,n=t.map(e=>`${e.geometry.uuid}:${e.visible?e.geometry.drawRange.count:0}`).join(`|`);if(e.candidateKey===n)return e.candidates;let r=c.get(e);if(o&&!r&&c.set(e,r=new Map),r?.has(n)){let t=r.get(n);return r.delete(n),r.set(n,t),e.candidateKey=n,e.candidates=t,t}let i=[],a=new g,s=new g,l=new g,u=new g,d=new g,f=0;for(let n of t){if(!n.visible)continue;let t=n.geometry.getAttribute(`position`),r=n.geometry.index,o=n.geometry.drawRange.start;if(!t)continue;let c=Math.min(r?.count??t.count,o+n.geometry.drawRange.count);for(let n=o;n+2<c;n+=3,f++){a.fromBufferAttribute(t,r?r.getX(n):n).applyMatrix4(e.matrix),s.fromBufferAttribute(t,r?r.getX(n+1):n+1).applyMatrix4(e.matrix),l.fromBufferAttribute(t,r?r.getX(n+2):n+2).applyMatrix4(e.matrix),u.subVectors(s,a),d.subVectors(l,a),u.cross(d);let o=u.length()/2;if(o<2e-5)continue;u.divideScalar(2*o);let c=u.x*xa[0]+u.y*xa[1]+u.z*xa[2];if(c<.2)continue;let p=[(a.x+s.x+l.x)/3,(a.y+s.y+l.y)/3,(a.z+s.z+l.z)/3],m=[u.x,u.y,u.z];i.push({index:f,point:p,normal:m,facing:c,score:Math.round(c*Math.min(1,o/.002)*1e3),anchor:p.map((e,t)=>e+m[t]*Sa)})}}i.sort((e,t)=>t.score-e.score||e.index-t.index);let p=[];for(let e of[()=>!0,e=>e.normal[1]>.7]){let t=new Set,n=0;for(let r of i){if(!e(r))continue;let i=r.point.map(e=>Math.floor(e/.1)).join(`,`);if(!t.has(i)&&(t.add(i),p.includes(r)||p.push(r),++n>=64))break}}return e.candidateKey=n,e.candidates=p,r&&(r.set(n,p),r.size>16&&r.delete(r.keys().next().value)),p}let u=1/0,d=null,f=new WeakMap;function p(e,a){let o=a.x-e[0],s=a.y-e[1],c=a.z-e[2],l=Math.hypot(o,s,c);for(let a=0;a<l;){let d=e[0]+o*a/l,f=e[1]+s*a/l,p=e[2]+c*a/l;if(d<i.xmin||d>i.xmax||p<i.zmin||p>i.zmax||f>u+.01)return!1;if(t(d,f-.003,p))return!0;a+=Math.max(.005,(f-va(n,r,d,p))/3)}return!1}let m=new Pe,h=new g,_=new g;function v(t,n){_.set(t[0]-n.x,t[1]-n.y,t[2]-n.z);let r=_.length();_.divideScalar(r),m.set(n,_),m.near=0,m.far=Math.max(0,r-1e-4);for(let t of e)if(!(!m.ray.intersectBox(t.bbox,h)||h.distanceTo(n)>m.far)){for(let e of t.handle.object.children)if(e.visible&&e.material.visible&&e.material.opacity!==0&&a(e,m))return!0}return!1}return{candidates:l,refresh(){let t=e.map(e=>e.handle.object.children.map(e=>`${e.geometry.uuid}:${e.visible?e.geometry.drawRange.count:0}`).join(`,`)).join(`|`);t!==d&&(d=t,f=new WeakMap),u=-1/0;for(let e=0;e<r.length;e++)r[e]>u&&(u=r[e])},eyesClear(e){let t=f.get(e);return t||f.set(e,t=s.map(t=>!v(e.anchor,t))),s.map((n,r)=>t[r]&&!p(e.anchor,n))},pick(e){let t=null,n=0;for(let r of l(e)){let e=this.eyesClear(r).filter(Boolean).length;if(e>n&&(t=r,n=e),e===s.length)break}return{candidate:t??l(e)[0]??null,eyes:n}}}}var Da={sourceHash:`ef77d5a67b62e2767db0b964aae1cfd2f0e367ef967cf23c607a31df7c9c6199`,features:[`modern-brick-1948`,`modern-china-1955`,`mughal-porcelain`,`mughal-glass`,`sultanate-corner`,`sultanate-lime-floor`,`rajput-wall`,`rajput-postholes`,`rajput-rubble`,`rajput-pottery-dump`,`rajput-sealed-pit`,`post-gupta-wall-ns`,`post-gupta-wall-ew`,`gupta-floor`,`gupta-brickbat-wall`,`kushan-house`,`pillar-base-as-drawn`,`top-left-stone-as-drawn`,`kushan-bricks`,`sunga-masonry`,`sunga-burnt-patches`,`sunga-kushan-lane`,`mauryan-drain`,`pre-mauryan-sherds`],parts:[`B`,`A`,`B12-Q15-southeastern-complex-1`,`at masonry`,`M01-north-mudbrick-1`,`B08-passage-east-end-1`,`S02-east-lower-stone-3`,`S01-east-upper-stone-1`,`S02-east-lower-stone-2`],points:[[10.6,-.552246,8.052421,0,0,1,-1],[-11,1.774122,8.017127,0,0,1,-1],[-.52,-.200739,8.017216,0,0,1,-1],[-5.52,.327184,8.018147,0,0,1,-1],[-1.515635,.529413,4.035389,.38627,.831359,.399548,-1],[.807982,-.02332,4.09455,0,.048437,.998826,0],[-9.778331,-.408948,6.21,0,0,1,-1],[-8.388994,-.102152,3.875201,.587785,0,.809017,-1],[-11.086474,-.44273,6.945657,.268121,.877268,.398135,-1],[-9.992667,-.541521,8.013,0,0,1,-1],[-5.534945,-2.457935,7.87063,.706752,0,.707462,-1],[-.569007,-2.153282,8.013,0,0,1,-1],[-4.753812,-1.420837,5.724909,.997786,.06651,-1e-6,-1],[-4.037629,-2.436458,7.022256,.096387,.965498,.241917,1],[-4.204708,-2.146726,5.06,0,0,1,-1],[1.777256,-3.556008,7.650251,.742602,0,.669733,2],[2.954396,-2.958981,1.729172,.322579,.657028,.681365,-1],[-1.67006,-1.950491,-3.311247,.698644,.664488,.26524,-1],[11.403333,-4.714385,8.023994,0,0,1,-1],[7.833124,-4.799735,3.55813,.713814,.093766,.69403,-1],[7.041389,-4.461609,2.473192,.653981,0,.756511,3],[9.696469,-5.171569,7.562692,.681664,0,.731665,-1],[6.564487,-5.546988,6.548873,.103996,.990757,.087094,-1],[2,-7.215001,8.017656,0,0,1,-1],[-9.615486,-.084653,6.21,0,0,1,-1],[-1.705619,-2.318611,4.29668,.668745,0,.743492,0],[3.72241,-2.791045,-1.876409,.604868,.092895,.790889,4],[5.026057,-5.50456,6.545748,.844679,.216243,.489649,-1],[-8.155696,.279205,6.176149,.116957,.981857,.149257,-1],[-5.246833,-1.386143,5.804,0,0,1,-1],[5.912391,-3.694973,5.15143,.056838,.994463,.088388,5],[-10.752426,-.227731,6.21,0,0,1,-1],[-1.515037,.461501,4.176117,.38627,.831359,.399547,-1],[-4.351874,.536499,4.200442,0,0,1,1],[-1.067174,.646686,3.388836,.341276,.862018,.374774,-1],[-1.982657,.280301,4.409806,.255045,.928524,.269806,1],[-7.506419,.274345,5.965557,.119127,.980175,.15832,-1],[-11.580417,.556523,6.925831,.238649,.94454,.225588,-1],[-1.344511,.395281,3.817405,.245491,.906792,.34273,-1],[-8.513789,.319156,3.847537,.101606,.980167,.170144,-1],[-11.010113,.418798,6.045382,.121924,.932522,.339908,-1],[-4.099667,-1.462838,5.804,0,0,1,-1],[-3.107777,-2.185755,5.06,0,0,1,-1],[5.004433,-3.276258,3.671025,.20032,.906289,.372171,6],[-1.666828,-1.968536,-3.191408,.597048,.656426,.461129,-1],[7.44441,-4.589184,5.590533,.046817,.971829,.230992,-1],[7.143882,-4.463126,2.513713,.085971,.963212,.25462,3],[10.130297,-5.219338,7.921966,.131313,.984629,.115161,-1],[7.833233,-4.647616,3.046629,.713808,.093848,.694025,-1],[5.423932,-5.461883,6.259683,.081146,.992791,.088216,-1],[7.799793,-5.720824,6.487551,.056838,.994463,.088386,-1],[6.199793,-5.613971,6.314217,.056838,.994463,.088386,-1],[7.000818,-5.610242,6.252963,.025291,0,.99968,-1],[10.28606,-5.064963,6.320723,.209673,.972634,.100101,-1],[7.584048,-4.671762,3.515552,.713981,.09165,.694141,-1],[7.442817,-4.841856,5.829017,-.025441,.963498,.266502,-1],[8.079893,-4.670222,4.569174,.364393,.899276,.241908,-1],[8.079049,-4.660837,4.887862,.17324,.05861,.983134,-1],[7.678212,-4.659873,5.919995,.231127,.925444,.300222,-1],[6.062071,-3.177723,.205271,.707116,0,.707097,7],[-1.833923,-2.056749,-3.001049,.763424,0,.645898,-1],[5.453592,-3.07245,1.65585,.707107,0,.707107,8],[-1.650246,-2.021878,-3.18594,.822114,0,.569322,-1],[2.896118,-2.927888,1.665999,.087414,.98046,.176227,-1],[-1.84448,-1.958421,-3.087656,.071446,.983122,.168422,-1],[5.197793,-3.212143,3.385518,.071532,.973147,.218787,6],[-2.395178,-2.596328,7.036282,.424894,0,.905243,1],[-4.163152,-2.095185,5.06,0,0,1,-1],[-4.448124,-1.39653,5.745752,-.054647,0,.998506,-1],[-10.812233,.04289,6.21,0,0,1,-1],[-10.716257,.249745,6.21,0,0,1,-1],[-11.205117,.277365,7.879446,.19218,.099232,.97633,-1],[-10.187536,.220442,6.21,0,0,1,-1],[-1.556786,.518878,4.097092,.38627,.831359,.399547,-1],[-3.584951,.917769,3.411996,.39282,.857729,.331654,-1],[-9.745206,.190923,6.21,0,0,1,-1]],states:{"12|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,13,14,16,19,20,23,25,27,29,31,32,34,37,38,40,42,45,47],"11|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,49,14,16,19,20,23,25,50,28,52,32,34,37,38,40,42,54,47],"9|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,57,14,16,19,20,23,58,50,28,61,32,34,37,38,40,42,54,47],"8|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"7|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"5|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"4|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"3|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"1|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9884672052024591|1,1,1,1,1,1,1,1,1,0.9884672052024591":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9235888838083631|1,1,1,1,1,1,1,1,1,0.9235888838083631":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.7901234567901249|1,1,1,1,1,1,1,1,1,0.7901234567901249":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.6033125031753259|1,1,1,1,1,1,1,1,1,0.6033125031753259":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.39668749682466864|1,1,1,1,1,1,1,1,1,0.39668749682466864":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.20987654320987503|1,1,1,1,1,1,1,1,1,0.20987654320987503":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.07641111619163643|1,1,1,1,1,1,1,1,1,0.07641111619163643":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.011532794797540658|1,1,1,1,1,1,1,1,1,0.011532794797540658":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9987529731352893,0|1,1,1,1,1,1,1,1,0.9987529731352893,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9908026448647109,0|1,1,1,1,1,1,1,1,0.9908026448647109,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9714726644455992,0|1,1,1,1,1,1,1,1,0.9714726644455992,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9380657510741655,0|1,1,1,1,1,1,1,1,0.9380657510741655,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8896083300224141,0|1,1,1,1,1,1,1,1,0.8896083300224141,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8265951687750642,0|1,1,1,1,1,1,1,1,0.8265951687750642,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.7507340131664679,0|1,1,1,1,1,1,1,1,0.7507340131664679,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.6646902235175294,0|1,1,1,1,1,1,1,1,0.6646902235175294,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.5718314107726252,0|1,1,1,1,1,1,1,1,0.5718314107726252,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.47597207263652064,0|1,1,1,1,1,1,1,1,0.47597207263652064,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.3811182297112987,0|1,1,1,1,1,1,1,1,0.3811182297112987,0":[-1,-1,5,7,69,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.29121206163326485,0|1,1,1,1,1,1,1,1,0.29121206163326485,0":[-1,-1,5,7,69,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.20987654320987648,0|1,1,1,1,1,1,1,1,0.20987654320987648,0":[-1,-1,5,7,69,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.14016008055665885,0|1,1,1,1,1,1,1,1,0.14016008055665885,0":[-1,-1,5,7,69,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.0842811472341255,0|1,1,1,1,1,1,1,1,0.0842811472341255,0":[-1,-1,5,7,69,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.0433729203846962,0|1,1,1,1,1,1,1,1,0.0433729203846962,0":[-1,-1,5,7,69,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.017227916869619775,0|1,1,1,1,1,1,1,1,0.017227916869619775,0":[-1,-1,5,7,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.004042629405887066,0|1,1,1,1,1,1,1,1,0.004042629405887066,0":[-1,-1,5,7,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.00016216270315716486,0|1,1,1,1,1,1,1,1,0.00016216270315716486,0":[-1,-1,5,7,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.99973423034234,0,0|1,1,1,1,1,1,1,0.99973423034234,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9934741168946484,0,0|1,1,1,1,1,1,1,0.9934741168946484,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9726430497325019,0,0|1,1,1,1,1,1,1,0.9726430497325019,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9323472489467532,0,0|1,1,1,1,1,1,1,0.9323472489467532,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.8710781056932286,0,0|1,1,1,1,1,1,1,0.8710781056932286,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.7901234567901226,0,0|1,1,1,1,1,1,1,0.7901234567901226,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.6929788593154023,0,0|1,1,1,1,1,1,1,0.6929788593154023,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.5847588652041897,0,0|1,1,1,1,1,1,1,0.5847588652041897,0,0":[-1,-1,-1,-1,69,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.4716082958461667,0,0|1,1,1,1,1,1,1,0.4716082958461667,0,0":[-1,-1,-1,-1,69,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.3601135166829682,0,0|1,1,1,1,1,1,1,0.3601135166829682,0,0":[-1,-1,-1,-1,69,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.25671371180557756,0,0|1,1,1,1,1,1,1,0.25671371180557756,0,0":[-1,-1,-1,-1,77,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.16711215855172423,0,0|1,1,1,1,1,1,1,0.16711215855172423,0,0":[-1,-1,-1,-1,77,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.09568750210327637,0,0|1,1,1,1,1,1,1,0.09568750210327637,0,0":[-1,-1,-1,-1,77,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.044905030083637554,0,0|1,1,1,1,1,1,1,0.044905030083637554,0,0":[-1,-1,-1,-1,77,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.014727947155150023,0,0|1,1,1,1,1,1,1,0.014727947155150023,0,0":[-1,-1,-1,-1,77,71,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.0020286496164738654,0,0|1,1,1,1,1,1,1,0.0020286496164738654,0,0":[-1,-1,-1,-1,77,71,73,79,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,79,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9963738004574146,0,0,0|1,1,1,1,1,1,0.9963738004574146,0,0,0":[-1,-1,-1,-1,-1,-1,73,79,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9742820829488966,0,0,0|1,1,1,1,1,1,0.9742820829488966,0,0,0":[-1,-1,-1,-1,-1,-1,73,-1,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9235888838083633,0,0,0|1,1,1,1,1,1,0.9235888838083633,0,0,0":[-1,-1,-1,-1,-1,-1,73,-1,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.8417853011382668,0,0,0|1,1,1,1,1,1,0.8417853011382668,0,0,0":[-1,-1,-1,-1,-1,-1,73,-1,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.7323837975951749,0,0,0|1,1,1,1,1,1,0.7323837975951749,0,0,0":[-1,-1,-1,-1,-1,-1,73,-1,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.6033125031753286,0,0,0|1,1,1,1,1,1,0.6033125031753286,0,0,0":[-1,-1,-1,-1,-1,-1,73,-1,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.46530951800022136,0,0,0|1,1,1,1,1,1,0.46530951800022136,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.33031721510216827,0,0,0|1,1,1,1,1,1,0.33031721510216827,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.20987654320987725,0,0,0|1,1,1,1,1,1,0.20987654320987725,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.11352132953402061,0,0,0|1,1,1,1,1,1,0.11352132953402061,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.04717258255280432,0,0,0|1,1,1,1,1,1,0.04717258255280432,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.011532794797540324,0,0,0|1,1,1,1,1,1,0.011532794797540324,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.0004802456382226872,0,0,0|1,1,1,1,1,1,0.0004802456382226872,0,0,0":[-1,-1,-1,-1,-1,-1,63,-1,81,19,20,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9992108193145053,0,0,0,0|1,1,1,1,1,0.9992108193145053,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.981479183586763,0,0,0,0|1,1,1,1,1,0.981479183586763,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9261847285778618,0,0,0,0|1,1,1,1,1,0.9261847285778618,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.8275126027216291,0,0,0,0|1,1,1,1,1,0.8275126027216291,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.6916142084787423,0,0,0,0|1,1,1,1,1,0.6916142084787423,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.5328677479533341,0,0,0,0|1,1,1,1,1,0.5328677479533341,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,83,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.370138768509619,0,0,0,0|1,1,1,1,1,0.370138768509619,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.2230407083884769,0,0,0,0|1,1,1,1,1,0.2230407083884769,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.1081954423240793,0,0,0,0|1,1,1,1,1,0.1081954423240793,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.03549382716049454,0,0,0,0|1,1,1,1,1,0.03549382716049454,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.004356247468295882,0,0,0,0|1,1,1,1,1,0.004356247468295882,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,27,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9999888730637821,0,0,0,0,0|1,1,1,1,0.9999888730637821,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9874231469484028,0,0,0,0,0|1,1,1,1,0.9874231469484028,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9266659617424005,0,0,0,0,0|1,1,1,1,0.9266659617424005,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.8053107210147524,0,0,0,0,0|1,1,1,1,0.8053107210147524,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.6347926862445883,0,0,0,0,0|1,1,1,1,0.6347926862445883,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,85,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.4415586590766919,0,0,0,0,0|1,1,1,1,0.4415586590766919,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.25823666357699915,0,0,0,0,0|1,1,1,1,0.25823666357699915,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,87,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.11480562848809528,0,0,0,0,0|1,1,1,1,0.11480562848809528,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,87,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.029765069484711693,0,0,0,0,0|1,1,1,1,0.029765069484711693,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,87,33,89,37,38,40,42,54,47],"0|1,1,1,1,0.0013047714292282464,0,0,0,0,0|1,1,1,1,0.0013047714292282464,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,87,33,89,37,38,40,42,54,47],"0|1,1,1,0.9980748397681338,0,0,0,0,0,0|1,1,1,0.9980748397681338,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,38,40,42,54,47],"0|1,1,1,0.9572205544936635,0,0,0,0,0,0|1,1,1,0.9572205544936635,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,38,40,42,54,47],"0|1,1,1,0.8400556793855923,0,0,0,0,0,0|1,1,1,0.8400556793855923,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,38,40,42,54,47],"0|1,1,1,0.6533805941358034,0,0,0,0,0,0|1,1,1,0.6533805941358034,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,38,40,42,54,47],"0|1,1,1,0.4332631353379557,0,0,0,0,0,0|1,1,1,0.4332631353379557,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,38,40,42,54,47],"0|1,1,1,0.22782244536879248,0,0,0,0,0,0|1,1,1,0.22782244536879248,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,91,40,42,54,47],"0|1,1,1,0.08001282126944942,0,0,0,0,0,0|1,1,1,0.08001282126944942,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,91,40,42,54,47],"0|1,1,1,0.010407563626763428,0,0,0,0,0,0|1,1,1,0.010407563626763428,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,33,89,37,91,93,95,54,47],"0|1,1,0.9999702173488851,0,0,0,0,0,0,0|1,1,0.9999702173488851,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,91,93,95,54,47],"0|1,1,0.9685544787631994,0,0,0,0,0,0,0|1,1,0.9685544787631994,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,91,93,95,54,47],"0|1,1,0.8311204048634441,0,0,0,0,0,0,0|1,1,0.8311204048634441,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,91,93,95,54,47],"0|1,1,0.5944581408770728,0,0,0,0,0,0,0|1,1,0.5944581408770728,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,91,93,95,54,47],"0|1,1,0.3275049239438246,0,0,0,0,0,0,0|1,1,0.3275049239438246,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,95,54,47],"0|1,1,0.11531020021773453,0,0,0,0,0,0,0|1,1,0.11531020021773453,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,95,99,47],"0|1,1,0.013000741969142804,0,0,0,0,0,0,0|1,1,0.013000741969142804,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,95,99,47],"0|1,0.9995904350121743,0,0,0,0,0,0,0,0|1,0.9995904350121743,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,99,47],"0|1,0.9336763190809408,0,0,0,0,0,0,0,0|1,0.9336763190809408,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.7065169301379017,0,0,0,0,0,0,0,0|1,0.7065169301379017,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.38602075978543193,0,0,0,0,0,0,0,0|1,0.38602075978543193,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.11787695080043237,0,0,0,0,0,0,0,0|1,0.11787695080043237,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.005892756865827242,0,0,0,0,0,0,0,0|1,0.005892756865827242,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9884672052024591,0,0,0,0,0,0,0,0,0|0.9884672052024591,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.7901234567901176,0,0,0,0,0,0,0,0,0|0.7901234567901176,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.3966874968246662,0,0,0,0,0,0,0,0,0|0.3966874968246662,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.07641111619163643,0,0,0,0,0,0,0,0,0|0.07641111619163643,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.0651961591220851,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.1274951989026062,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.1869629629629629,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.24366529492455424,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.29766803840877765,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.3490370370370355,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.3978381344307256,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.44413717421124943,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.4880000000000012,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.5294924554183825,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.5686803840877915,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.6056296296296295,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.640406035665295,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.6730754458161865,0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"0|0.7037037037037036,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.7323566529492456,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.7591001371742112,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.7839999999999999,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.807122085048011,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.8285322359396433,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.8482962962962962,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.8664801097393691,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.8831495198902607,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.8983703703703704,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9122085048010974,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9247297668038409,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9359999999999999,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9460850480109739,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9550507544581619,0,0,0,0,0,0,0,0,0|0.25,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9629629629629629,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9698875171467765,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9758902606310014,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.981037037037037,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9853936899862826,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9890260631001372,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.992,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9943813443072702,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.996235939643347,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9976296296296296,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9986282578875172,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9992976680384088,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9997037037037036,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9999122085048011,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|0.9999890260631001,0,0,0,0,0,0,0,0,0|0.5,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0,0,0,0,0,0,0,0,0|0.75,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.0651961591220851,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.1274951989026062,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.1869629629629629,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.24366529492455424,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.2976680384087793,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.3490370370370369,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.397838134430727,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.4441371742112483,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.4879999999999999,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.5294924554183813,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.5686803840877915,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.6056296296296295,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.640406035665295,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.6730754458161865,0,0,0,0,0,0,0,0|1,0,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.7037037037037036,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.7323566529492456,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.7591001371742112,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.7839999999999999,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.807122085048011,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.8285322359396433,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.8482962962962962,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.8664801097393691,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.8831495198902607,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.8983703703703704,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9122085048010974,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9247297668038409,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9359999999999999,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9460850480109739,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9550507544581619,0,0,0,0,0,0,0,0|1,0.25,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9629629629629629,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9698875171467765,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9758902606310014,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.981037037037037,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,47],"0|1,0.9853936899862826,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,101,47],"0|1,0.9890260631001372,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,101,47],"0|1,0.992,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,101,47],"0|1,0.9943813443072702,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.996235939643347,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.9976296296296296,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.9986282578875172,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.9992976680384088,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.9997037037037036,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.9999122085048011,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,0.9999890260631001,0,0,0,0,0,0,0,0|1,0.5,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,1,0,0,0,0,0,0,0,0|1,0.75,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,1,0,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,103,47],"0|1,1,0.06519615912208865,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,105,47],"0|1,1,0.1274951989026062,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,99,47],"0|1,1,0.18696296296296644,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.24366529492455424,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.2976680384087822,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.3490370370370369,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.397838134430727,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.4441371742112483,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.4879999999999999,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.5294924554183791,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.5686803840877915,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.6056296296296275,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.640406035665295,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.6730754458161847,0,0,0,0,0,0,0|1,1,0,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,54,47],"0|1,1,0.7037037037037036,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.732356652949247,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.7591001371742112,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.7840000000000014,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.807122085048011,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.8285322359396445,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.8482962962962962,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.8664801097393691,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.8831495198902607,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.8983703703703704,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,97,93,107,54,47],"0|1,1,0.9122085048010967,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,109,93,107,54,47],"0|1,1,0.9247297668038409,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,111,93,107,54,47],"0|1,1,0.9359999999999994,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,111,93,107,54,47],"0|1,1,0.9460850480109739,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,111,93,107,54,47],"0|1,1,0.9550507544581613,0,0,0,0,0,0,0|1,1,0.25,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,111,93,107,54,47],"0|1,1,0.9629629629629629,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9698875171467768,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9758902606310014,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.981037037037037,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9853936899862826,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9890260631001372,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.992,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9943813443072702,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.996235939643347,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9976296296296296,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9986282578875172,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9992976680384088,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9997037037037036,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9999122085048011,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,0.9999890260631001,0,0,0,0,0,0,0|1,1,0.5,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,1,0,0,0,0,0,0,0|1,1,0.75,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,1,0,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,93,107,54,47],"0|1,1,1,0.0651961591220851,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,113,40,42,54,47],"0|1,1,1,0.1274951989026062,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,115,40,42,54,47],"0|1,1,1,0.1869629629629629,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,117,40,42,54,47],"0|1,1,1,0.24366529492455424,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.2976680384087793,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.3490370370370369,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.397838134430727,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.4441371742112483,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.4879999999999999,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.5294924554183813,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.5686803840877915,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.6056296296296295,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.640406035665295,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.6730754458161865,0,0,0,0,0,0|1,1,1,0,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,38,40,42,54,47],"0|1,1,1,0.7037037037037036,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.7323566529492456,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.7591001371742112,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.7839999999999999,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.807122085048011,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.8285322359396433,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.8482962962962962,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.8664801097393691,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.8831495198902607,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.8983703703703704,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.9122085048010974,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.9247297668038409,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.9359999999999999,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,119,33,121,37,38,40,42,54,47],"0|1,1,1,0.9460850480109739,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,121,37,38,40,42,54,47],"0|1,1,1,0.9550507544581619,0,0,0,0,0,0|1,1,1,0.25,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,121,37,38,40,42,54,47],"0|1,1,1,0.9629629629629629,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,121,37,38,40,42,54,47],"0|1,1,1,0.9698875171467765,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,121,37,38,40,42,54,47],"0|1,1,1,0.9758902606310014,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,125,37,38,40,42,54,47],"0|1,1,1,0.981037037037037,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,125,37,38,40,42,54,47],"0|1,1,1,0.9853936899862826,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,125,37,38,40,42,54,47],"0|1,1,1,0.9890260631001372,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,125,37,38,40,42,54,47],"0|1,1,1,0.992,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,125,37,38,40,42,54,47],"0|1,1,1,0.9943813443072702,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.996235939643347,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.9976296296296296,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.9986282578875172,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.9992976680384088,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.9997037037037036,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.9999122085048011,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,0.9999890260631001,0,0,0,0,0,0|1,1,1,0.5,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,1,0,0,0,0,0,0|1,1,1,0.75,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,1,0,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,33,89,37,38,40,42,54,47],"0|1,1,1,1,0.0651961591220851,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,127,129,37,38,40,42,54,47],"0|1,1,1,1,0.1274951989026062,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.1869629629629629,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,123,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.24366529492455424,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,87,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.2976680384087793,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,131,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.3490370370370369,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.397838134430727,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.4441371742112483,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.4879999999999999,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.5294924554183813,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.5686803840877915,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.6056296296296295,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.640406035665295,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.6730754458161865,0,0,0,0,0|1,1,1,1,0,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.7037037037037036,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.7323566529492456,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.7591001371742112,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.7839999999999999,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.807122085048011,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.8285322359396433,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.8482962962962962,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.8664801097393691,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.8831495198902607,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.8983703703703704,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9122085048010974,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9247297668038409,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9359999999999999,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9460850480109739,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9550507544581619,0,0,0,0,0|1,1,1,1,0.25,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9629629629629629,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9698875171467765,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9758902606310014,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,133,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.981037037037037,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9853936899862826,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9890260631001372,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.992,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9943813443072702,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.996235939643347,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9976296296296296,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9986282578875172,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9992976680384088,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9997037037037036,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9999122085048011,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,0.9999890260631001,0,0,0,0,0|1,1,1,1,0.5,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0,0,0,0,0|1,1,1,1,0.75,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,27,29,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.0651961591220851,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,135,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.1274951989026062,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.1869629629629629,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.24366529492455424,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.2976680384087793,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.3490370370370369,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.397838134430727,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.4441371742112483,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.4879999999999999,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.5294924554183813,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.5686803840877915,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.6056296296296295,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.640406035665295,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.6730754458161865,0,0,0,0|1,1,1,1,1,0,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.7037037037037036,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.7323566529492456,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.7591001371742112,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.7839999999999999,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.807122085048011,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.8285322359396433,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.8482962962962962,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.8664801097393691,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.8831495198902607,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.8983703703703704,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9122085048010974,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9247297668038409,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9359999999999999,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9460850480109739,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9550507544581619,0,0,0,0|1,1,1,1,1,0.25,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9629629629629629,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9698875171467765,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9758902606310014,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.981037037037037,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9853936899862826,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9890260631001372,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.992,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9943813443072702,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.996235939643347,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9976296296296296,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9986282578875172,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9992976680384088,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9997037037037036,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9999122085048011,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,0.9999890260631001,0,0,0,0|1,1,1,1,1,0.5,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0,0,0,0|1,1,1,1,1,0.75,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,59,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.0651961591220851,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,137,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.12749519890261318,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.1869629629629629,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.24366529492455424,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.2976680384087732,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.3490370370370427,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.397838134430727,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.4441371742112483,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.4879999999999952,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.529492455418386,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.5686803840877915,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.6056296296296295,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.640406035665291,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.6730754458161865,0,0,0|1,1,1,1,1,1,0,0,0,0":[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.7037037037037036,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.7323566529492456,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.7591001371742141,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.7839999999999999,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.807122085048011,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.8285322359396411,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.8482962962962985,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.8664801097393691,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.8831495198902607,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,139,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.8983703703703687,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9122085048010989,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9247297668038409,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9359999999999999,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9460850480109728,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9550507544581619,0,0,0|1,1,1,1,1,1,0.25,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,81,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9629629629629629,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9698875171467765,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.975890260631002,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.981037037037037,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9853936899862826,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,-1,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9890260631001369,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9920000000000003,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9943813443072702,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.996235939643347,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9976296296296295,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9986282578875172,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9992976680384088,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9997037037037036,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9999122085048011,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,0.9999890260631001,0,0,0|1,1,1,1,1,1,0.5,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0,0,0|1,1,1,1,1,1,0.75,0,0,0":[-1,-1,-1,-1,-1,-1,141,79,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.0651961591220851,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,141,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.1274951989026062,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,145,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.1869629629629629,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.24366529492455424,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.2976680384087793,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.3490370370370369,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.397838134430727,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,143,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.4441371742112483,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.4879999999999999,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,75,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.5294924554183813,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.5686803840877915,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,73,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.6056296296296295,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.640406035665295,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.6730754458161865,0,0|1,1,1,1,1,1,1,0,0,0":[-1,-1,-1,-1,-1,-1,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.7037037037037036,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.7323566529492456,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.7591001371742112,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.7839999999999999,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.807122085048011,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.8285322359396433,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.8482962962962962,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.8664801097393691,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.8831495198902607,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.8983703703703704,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9122085048010974,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9247297668038409,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9359999999999999,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9460850480109739,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9550507544581619,0,0|1,1,1,1,1,1,1,0.25,0,0":[-1,-1,-1,-1,77,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9629629629629629,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9698875171467765,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9758902606310014,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.981037037037037,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9853936899862826,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9890260631001372,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.992,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9943813443072702,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.996235939643347,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9976296296296296,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9986282578875172,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9992976680384088,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9997037037037036,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9999122085048011,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,0.9999890260631001,0,0|1,1,1,1,1,1,1,0.5,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0,0|1,1,1,1,1,1,1,0.75,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,147,71,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.0651961591220851,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,147,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.1274951989026062,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,147,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.1869629629629629,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,147,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.24366529492455424,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,147,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.2976680384087793,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,147,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.3490370370370369,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,149,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.397838134430727,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.4441371742112483,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.4879999999999999,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.5294924554183813,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.5686803840877915,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.6056296296296295,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.640406035665295,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.6730754458161865,0|1,1,1,1,1,1,1,1,0,0":[-1,-1,-1,-1,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.7037037037037036,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.7323566529492456,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.7591001371742112,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.7839999999999999,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.807122085048011,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8285322359396433,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8482962962962962,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8664801097393691,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8831495198902607,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.8983703703703704,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9122085048010974,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9247297668038409,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9359999999999999,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9460850480109739,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9550507544581619,0|1,1,1,1,1,1,1,1,0.25,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9629629629629629,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9698875171467765,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9758902606310014,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.981037037037037,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9853936899862826,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9890260631001372,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.992,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9943813443072702,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.996235939643347,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9976296296296296,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9986282578875172,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9992976680384088,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9997037037037036,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9999122085048011,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,0.9999890260631001,0|1,1,1,1,1,1,1,1,0.5,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0|1,1,1,1,1,1,1,1,0.75,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.0651961591220851|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.1274951989026062|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.1869629629629629|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.24366529492455424|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.2976680384087793|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.3490370370370369|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.397838134430727|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.4441371742112483|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.4879999999999999|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.5294924554183813|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.5686803840877915|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.6056296296296295|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.640406035665295|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.6730754458161865|1,1,1,1,1,1,1,1,1,0":[-1,-1,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.7037037037037036|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.7323566529492456|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.7591001371742112|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.7839999999999999|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.807122085048011|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.8285322359396433|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.8482962962962962|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.8664801097393691|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.8831495198902607|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.8983703703703704|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9122085048010974|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9247297668038409|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9359999999999999|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9460850480109739|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9550507544581619|1,1,1,1,1,1,1,1,1,0.25":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9629629629629629|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9698875171467765|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9758902606310014|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.981037037037037|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9853936899862826|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9890260631001372|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.992|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9943813443072702|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.996235939643347|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9976296296296296|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9986282578875172|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9992976680384088|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9997037037037036|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9999122085048011|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,0.9999890260631001|1,1,1,1,1,1,1,1,1,0.5":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"0|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,0.75":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"2|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,64,66,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"6|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,62,14,16,19,20,23,58,50,28,52,32,34,37,38,40,42,54,47],"10|1,1,1,1,1,1,1,1,1,1|1,1,1,1,1,1,1,1,1,1":[1,3,5,7,8,11,151,14,16,19,20,23,25,50,28,52,32,34,37,38,40,42,54,47]}},Oa=Object.freeze({xmin:-12,xmax:12,zmin:-8,zmax:8}),ka=e=>Math.round(Math.max(0,Math.min(1,Number(e)||0))*12),Aa=Object.fromEntries(pa.map((e,t)=>[e,t])),ja=()=>globalThis.performance?.now()??Date.now(),Ma,Na=[];function Pa(){return globalThis.scheduler?.yield?globalThis.scheduler.yield():globalThis.MessageChannel?(Ma||(Ma=new globalThis.MessageChannel,Ma.port1.onmessage=()=>{Na.shift()(),Na.length||(Ma.port1.unref?.(),Ma.port2.unref?.())}),new Promise(e=>{Na.push(e),Ma.port1.ref?.(),Ma.port2.ref?.(),Ma.port2.postMessage(null)})):new Promise(e=>setTimeout(e,0))}var Fa=Object.freeze({"sunga-burnt-patches":[`at masonry`]});function Ia(e){let t=e=>Math.max(0,Math.min(1,e));return`${ka(e.excavation)}|${e.deposits.map(t).join(`,`)}|${e.features.map(t).join(`,`)}`}function La(e,t){let n=t.elements,[r,i,a]=e.normal;return{normal:[n[0]*r+n[1]*i+n[2]*a,n[4]*r+n[5]*i+n[6]*a,n[8]*r+n[9]*i+n[10]*a],constant:r*n[12]+i*n[13]+a*n[14]+e.constant}}function Ra({group:e,items:t,ring:n,stack:r,driverData:i,anchorTable:a=Da,meshOccludes:o,cacheCandidates:s=!1,prepareAnchors:c=async()=>({maxChunkMs:0})}){let l=new Float32Array(r.nx*r.nz),u=i.centre,d=null,f={step:0,deposits:Array(10).fill(0)},p=0,m=!1,h=0,_=null,v=`exact`,y=null,b=!1,x=null,S=new Map,C=new Proxy({},{get(e,t){let n=Number(t);if(S.has(n))return S.get(n);let i=r.grids[0][n];for(let e=0;e<pa.length;e++)f.deposits[e]!==0&&(i=Math.fround(i+f.deposits[e]*(r.grids[e+1][n]-r.grids[e][n])));return S.set(n,i),i}}),w=a?Object.entries(a.states).map(([e,t])=>{let[n,r,i]=e.split(`|`);return{key:e,entry:t,step:Number(n),values:`${r},${i}`.split(`,`).map(Number)}}):[];function T(){return m&&(_a(r,f.deposits,l),m=!1,S.clear()),l}function E(){let e=null,t=1/0;for(let n of w){let r=Math.abs(n.step-f.step)*1e4;if(!(r>t)){for(let e=0;e<10;e++)r+=(n.values[e]-f.deposits[e])**2+(n.values[e+10]-f.features[e])**2;r<t&&(e=n,t=r)}}return y=e.key,e.entry}let D=i.volumes.map(e=>{let t=(t,n)=>e.floor.A*t+e.floor.B*n+e.floor.C,n=t=>(1-Math.max(0,Math.min(12,t))/12)*e.depthRange;return{...e,floorAt:t,stepFloorAt:(e,r,i)=>t(r,i)+n(e),removes:(r,i,a,o)=>r>0&&a>=t(i,o)+n(r)&&e.walls.every(e=>e.normal[0]*i+e.normal[1]*a+e.normal[2]*o+e.constant>=0)}}),O=(e,t,n,r)=>D.some(i=>i.removes(e,t,n,r));function ee(e){if(e!==p){p=e;for(let t of n.items)t.part!==`soil`&&(t.matrix.makeTranslation(0,e,0),t.handle.object.matrix.copy(t.matrix),t.handle.object.updateMatrixWorld(!0))}}function te(e,t){let n=e.specs.get(t);if(n)return n;let r=[];for(let n of e.rules){if(n.rule!==`remove`||t===0)continue;let i=n.volume,a=i.stepOffset(t),o=n.inside,s=!1;for(let e=0;e<o.length&&!s;e+=3)s=o[e+1]>=i.floorAt(o[e],o[e+2])+a;s&&r.push({planes:i.planesAt(t).map(t=>La(t,e.matrix)),finalFloor:-1e3})}return n={keep:e.keep,trenches:r},e.specs.set(t,n),n}function k(e,t,n,a=f.step){return e<Oa.xmin||e>Oa.xmax||n<Oa.zmin||n>Oa.zmax||t>=va(r,m?C:l,e,n)||f.deposits[Aa.sunga]<=0&&t>i.ring.topY+p&&Math.hypot(e-ba.x,n-ba.z)<ba.radius?!1:!O(a,e,t,n)}let A=Ea({items:t,soilAt:k,stack:r,activeTop:l,block:Oa,meshOccludes:o,cacheCandidates:s}),ne=(e,t)=>{let n=new g(...t.point).applyMatrix4(e.matrix),r=new g(...t.normal).applyMatrix3(e.normalMatrix).normalize();return{point:n.toArray(),normal:r.toArray()}};function re(e,t){let n=.03;return!k(e[0]+t[0]*n,e[1]+t[1]*n,e[2]+t[2]*n)}let j=(e,t)=>e.map((e,n)=>e+t[n]*Sa),M=new Map;for(let e of t)e.ring||(M.has(e.featureId)||M.set(e.featureId,[]),M.get(e.featureId).push(e));let N=Object.freeze({point:null,normal:null,visible:!1,revealed:!1,part:null});function P(e={}){T(),A.refresh();let t={};for(let[n,r]of M){let i=Fa[n],a=null;for(let t of r){let r=t.handle.anchors[t.kitId];if(!r||!r.visible)continue;let o=i&&i.includes(t.part)?2:0,s=t.findCandidates??A.candidates(t),c=null,l=0,u=e[n]&&s.find(t=>Ta(t.anchor).join(`,`)===e[n]);u&&A.eyesClear(u).every(Boolean)?(c=u,l=5):{candidate:c,eyes:l}=t.findCandidates?{candidate:s[0],eyes:A.eyesClear(s[0]).filter(Boolean).length}:A.pick(t);let d=c?{point:c.anchor,normal:c.normal,score:c.score}:{...(e=>({point:j(e.point,e.normal),normal:e.normal}))(ne(t,r)),score:-1},f=(u&&c===u?32:0)+(l===5?8:0)+(l>0?4:0)+o;(!a||f>a.rank||f===a.rank&&d.score>a.score)&&(a={rank:f,score:d.score,point:Ta(d.point),normal:Ta(d.normal),open:l>0,eyes:l,part:t.part})}t[n]=a?{point:a.point,normal:a.normal,visible:a.open,revealed:!0,part:a.part,eyes:a.eyes}:{...N}}return t}function ie(e){let t={};return a.features.forEach((n,r)=>{let i=e[r];if(i<0){t[n]={...N};return}let o=a.points[i>>1];t[n]={point:o.slice(0,3),normal:o.slice(3,6),visible:(i&1)==1,revealed:!0,part:o[6]<0?null:a.parts[o[6]]}}),t}function F(e,t,n=!1){let r=a?.states[t];r?y=t:n?r=E():y=null;let o=r?ie(r):P();if(!r)for(let e of Object.values(o))delete e.eyes;let s=i.sealedPit;if(s&&o[s.id]){let e=s.point;o[s.id]={...o[s.id],point:Ta(j(e,[0,0,1])),normal:[0,0,1],visible:o[s.id].revealed&&re(e,[0,0,1])}}{let t=i.preMauryanBand,n=Math.max(0,Math.min(1,e[0])),r=[-3,t[0]+(t[1]-t[0])*n/2,8];o[`pre-mauryan-soil`]={point:Ta(j(r,[0,0,1])),normal:[0,0,1],visible:n>0&&re(r,[0,0,1]),revealed:n>0,part:null}}{let e=i.ring,t=f.step,n=D.find(e=>e.id===`ring-well-pit`),r=ba.z+ba.radius,a=n.stepFloorAt(t,ba.x,r)<e.topY-.05,s=(Math.max(e.bottomY,n.stepFloorAt(t,ba.x,r))+e.topY)/2,c=a?[ba.x,s,r]:[ba.x,e.topY+p,r-.02],l=a?[0,0,1]:[0,1,0],u=f.features[Aa.mauryan]>0;o[`mauryan-ring-well`]={point:Ta(j(c,l)),normal:l,visible:u&&re(c,l),revealed:u,part:null}}{let e=D.find(e=>e.id===`controlled-pit:lower`),t=e.box,n=null;for(let r of[t.xmin,t.xmax])for(let i of[t.zmin,t.zmax]){let t=e.floorAt(r,i);(!n||t<n[1])&&(n=[r,t,i])}let r=[n[0]+Math.sign((t.xmin+t.xmax)/2-n[0])*.1,0,n[2]+Math.sign((t.zmin+t.zmax)/2-n[2])*.1];r[1]=e.floorAt(r[0],r[2]),o[`deepest-cut`]={point:Ta(j(r,[0,1,0])),normal:[0,1,0],visible:f.step===12&&re(r,[0,1,0]),revealed:f.step===12,part:null}}return o}function I(e){if(!e||e.schemaVersion!==1)throw Error(`applyState: schemaVersion 1 required`);for(let t of[`deposits`,`features`])if(!Array.isArray(e[t])||e[t].length!==10||!e[t].every(Number.isFinite))throw Error(`applyState: ${t} must be ten finite numbers`);if(!Number.isFinite(e.excavation))throw Error(`applyState: finite excavation required`)}function L(e){let t=u[0];for(let e=0;e<pa.length;e++)t+=f.deposits[e]*(u[e+1]-u[e]);return{featureAnchors:e,activeTopAnchor:{point:[0,t,0],normal:[0,1,0]},hasReconstructionOutline:!1,cutStep:f.step}}function ae(e,{anchors:r=`exact`}={}){if(I(e),r!==`nearest`&&r!==`exact`)throw Error(`applyState: anchors must be nearest or exact`);if(r===`nearest`&&!w.length)throw Error(`applyState: nearest anchors require a nonempty anchor table`);let i=ka(e.excavation),a=e.deposits.map(e=>Math.max(0,Math.min(1,e))),o=e.features.map(e=>Math.max(0,Math.min(1,e)));for(let e of t){e.step!==i&&(e.handle.setCuts(te(e,i),i),e.step=i);let t=e.dug&&a[e.era]<e.dugMin?0:o[e.era],n=e.handle.courseCount,r=t>0?Math.min(n,Math.ceil(Math.round((e.buried+t*(1-e.buried))*n*1e6)/1e6)):0;e.handle.setReveal(r>0?(r-.5)/n:0)}ee(o[Aa.mauryan]>0?Math.round(-(1-a[Aa.mauryan])*n.sinkMetres*1e6)/1e6:0);let s=a.join(`,`);return s!==d&&(d=s,m=!0,S.clear()),f={step:i,deposits:a,features:o},h++,_=Ia(e),v=r,r===`exact`&&T(),L(F(a,_,r===`nearest`))}async function R({signal:e}={}){if(_===null)throw Error(`refineAnchors: apply a state first`);let t=h,n=()=>!b&&!e?.aborted&&h===t,r=ja();if(!n())return null;let i=a?.states[_],o=i?null:await c({signal:e,priority:!0,valid:n});if(!n())return null;let s=ja(),l=o?.maxChunkMs??0,u=0,d=0,p=()=>{let e=ja()-s;l=Math.max(l,e),u+=e,d++},m=async()=>{p(),await Pa(),s=ja()};if(T(),!i){A.refresh();for(let e of M.values())for(let t of e){if(!n())return null;if(!t.handle.anchors[t.kitId]?.visible)continue;if(ja()-s>=8&&(await m(),!n()))return null;let e=t.findCandidates??A.candidates(t);if(ja()-s>=8&&(await m(),!n()))return null;for(let r of t.findCandidates?e.slice(0,1):e){if(A.eyesClear(r).every(Boolean))break;if(ja()-s>=8&&(await m(),!n()))return null}}}if(!n())return null;let g=L(F(f.deposits,_));return p(),v=`exact`,x={totalMs:ja()-r,workMs:u,maxChunkMs:l,chunks:d},g}function z(e){I(e);let n=ja(),r=ka(e.excavation);for(let e of t)e.handle.warmCuts(te(e,r),r);for(let e of B)e(r);return ja()-n}let B=[];return{group:e,items:t,stack:r,driverData:i,get activeTop(){return T()},ringWell:{tones:n.tones,sinkMetres:n.sinkMetres,offset:()=>p},applyState:ae,refineAnchors:R,prepareAnchors:c,warmState:z,soilAt:k,sceneWarmers:B,cutSteps:12,pickFeatureAnchors:P,anchorPicker:A,anchorStatus:()=>({mode:v,tableKey:y,topDirty:m,refinement:x}),get state(){return f},trenchRules:()=>t.map(e=>({key:e.key,rules:e.rules.map(e=>({volume:e.id,rule:e.rule===`preserve`&&e.topMinusFloor<0?`below the final floor`:e.rule,baseMinusFloor:+e.baseMinusFloor.toFixed(3),topMinusFloor:+e.topMinusFloor.toFixed(3)}))})),dispose(){b=!0,h++;for(let n of t)n.handle.dispose(),e.remove(n.handle.object)}}}var za=(e,t={})=>Object.freeze({...e,...t}),Ba=.35,Va=Object.freeze({id:`silt`,lab:[47,1.6,11],source:`P1 "yellowish clay"; texture and value M`,character:za({name:`fine yellowish clay, few inclusions`,mottle:.6,streak:.3,streakThickness:.05,streakLength:Ba,lump:.12,lumpPeriod:.06,speck:.1,patches:.04,relief:.5}),inclusions:{densityPerSquareMetre:2,diameterMetres:[.004,.015],mix:{charcoal:.5,sherd:.5}}}),Ha=Object.freeze([{id:`pre-mauryan`,lab:[37,.9,6],beds:Ii,source:`pack: "pale yellow and grayish textured soil"; band 7 character`,character:za(qi[6],{streakLength:Ba}),inclusions:Ji[6]},{id:`mauryan`,lab:[46.7,1.1,7.5],source:`occupation earth (M); sealing floor on top carries the drain (pack); compact with few clods and low relief (M) to part it from the flecked Sunga band`,character:za(qi[3],{name:`compact occupation earth, few clods`,mottle:1,lump:.3,relief:.6,streakLength:Ba}),seal:{lab:[49,1,7],thicknessMetres:[.06,.09],character:za(qi[2],{name:`compact sealing floor`,mottle:.6,streak:.25,lump:.1,speck:.08,patches:.04,relief:.45,streakLength:Ba})},inclusions:{densityPerSquareMetre:12,diameterMetres:[.01,.06],mix:{sherd:.5,brickbat:.3,charcoal:.2}}},{id:`sunga`,lab:[41,.8,5],source:`band 5 character: darker occupation earth, discrete burnt patches (pack: "a few burnt patches"), no continuous horizon; denser small charcoal flecks, more clods and relief (M)`,character:za(qi[4],{lump:.8,relief:1.4,streakLength:Ba}),inclusions:{densityPerSquareMetre:24,diameterMetres:[.006,.04],mix:{charcoal:.8,brickbat:.2}}},{id:`kushan`,lab:[47.8,1.4,9],source:`occupation earth; burnt-brick fragments the main inclusion (pack: "burnt bricks, which are in the majority")`,character:za(qi[3],{name:`occupation earth, burnt-brick fragments`,streakLength:Ba}),inclusions:{densityPerSquareMetre:30,diameterMetres:[.01,.12],mix:{brickbat:.75,sherd:.2,charcoal:.05},clusterShare:.4}},{id:`gupta`,lab:[42.5,1.2,7.5],source:`fine crushed-brick grit, compact (M; cue: pack "burnt bricks ... and brick-jelly floors"), against the coarse Kushan brick fragments`,character:za(qi[3],{name:`compact earth, fine brick grit`,mottle:1,lump:.25,lumpPeriod:.06,speck:.4,streak:.5,patches:.08,relief:.7,streakLength:Ba}),inclusions:{densityPerSquareMetre:70,diameterMetres:[.005,.025],mix:{brickbat:.8,sherd:.2}}},{id:`post-gupta`,lab:[49.5,1.3,9.5],source:`clotted earth, sparse brick-bats (M; cue: pack walls "made of brick-bats"), against the fine Gupta grit`,character:za(qi[3],{name:`clotted earth, sparse brick-bats`,lump:1.05,lumpPeriod:.14,speck:.08,streak:.3,patches:.2,relief:1.5,streakLength:Ba}),inclusions:{densityPerSquareMetre:8,diameterMetres:[.03,.1],mix:{brickbat:.6,sherd:.4}}},{id:`rajput`,lab:[39.7,1.4,7.5],source:`band 6 character: occupation earth with rubble (M)`,character:za(qi[5],{streakLength:Ba}),inclusions:Ji[5]},{id:`sultanate`,lab:[46,.9,6.5],source:`band 3 character: compact sealing earth (pack: seals the Sultanate structures)`,character:za(qi[2],{streakLength:Ba}),inclusions:null},{id:`mughal`,lab:[51,.7,5],source:`pack: "light greyish loose earth mixed with debris of lime floor plasters"; band 2 character, denser lime flecks than Round 6 (M)`,character:za(qi[1],{streak:.12,streakLength:.3}),inclusions:{...Ji[1],densityPerSquareMetre:70,diameterMetres:[.005,.035]}},{id:`modern-fill`,lab:[46,1,10.5],source:`pack: "yellowish loose soil and bands of ash"; band 1 character`,character:za(qi[0],{streakLength:Ba}),inclusions:Ji[0]}].map(Object.freeze));Object.freeze([9]),Object.freeze({strength:.07,widthMetres:[.02,.04],blendMetres:.012}),Object.freeze({weights:[.252,.21,.16],stretch:[3.5,3,2.5],patchStretch:3});var Ua=e=>Number(e).toFixed(6);(([e,,t])=>[e/Math.hypot(e,t),0,t/Math.hypot(e,t)])(aa);var Wa=Object.freeze([Va,...Ha]),Ga=Ha[1].seal;function Ka(e){if(!e||!e.densityPerSquareMetre)return[];let[t,n]=e.diameterMetres,r=n/t>3?Math.sqrt(t*n):n;return(r<n?[[t,r],[r,n]]:[[t,n]]).map(([r,i])=>{let a=Math.log(i/r)/Math.log(n/t),o=(i-r)/Math.log(i/r),s=i,c=e.densityPerSquareMetre*a,l=.85*o,u=Math.min(1,c*s**3/l);return{cell:s,prob:u,d0:r,d1:i,wantedPerSquareMetre:c,expectedPerSquareMetre:u*l/s**3}})}var qa=[`brickbat`,`sherd`,`lime`,`ash`,`charcoal`];function Ja(e,t){let n=Ri(t),r=e?Object.entries(e.mix):[[`sherd`,1]],i=[];for(let e=0;e<8;e++){let e=n(),t=r[0][0];for(let n=0,i=0;n<r.length;n++)if(i+=r[n][1],e<=i){t=r[n][0];break}i.push({kind:t,lab:la(t,n,Li.photo),flat:qa.includes(t)})}return i}Object.freeze(Wa.map((e,t)=>({id:e.id,classes:Ka(e.inclusions),colours:Ja(e.inclusions,77101+t*131),clusterShare:e.inclusions?.clusterShare??0})));function Ya(e){return`
    uniform highp sampler2D eraB0; uniform highp sampler2D eraB1; uniform highp sampler2D eraB2;
    void eraBounds(vec2 xz, out float b[11]) {
      vec2 g=clamp((xz-vec2(${Ua(e.xmin)},${Ua(e.zmin)}))/${Ua(e.stepMetres)},vec2(0.0),vec2(${e.nx-1}.0,${e.nz-1}.0));
      ivec2 i=min(ivec2(floor(g)),ivec2(${e.nx-2},${e.nz-2})); vec2 u=g-vec2(i);
      ivec2 i10=i+ivec2(1,0), i01=i+ivec2(0,1), i11=i+ivec2(1,1);
      vec4 A=mix(mix(texelFetch(eraB0,i,0),texelFetch(eraB0,i10,0),u.x),mix(texelFetch(eraB0,i01,0),texelFetch(eraB0,i11,0),u.x),u.y);
      vec4 B=mix(mix(texelFetch(eraB1,i,0),texelFetch(eraB1,i10,0),u.x),mix(texelFetch(eraB1,i01,0),texelFetch(eraB1,i11,0),u.x),u.y);
      vec4 C=mix(mix(texelFetch(eraB2,i,0),texelFetch(eraB2,i10,0),u.x),mix(texelFetch(eraB2,i01,0),texelFetch(eraB2,i11,0),u.x),u.y);
      b[0]=A.x;b[1]=A.y;b[2]=A.z;b[3]=A.w;b[4]=B.x;b[5]=B.y;b[6]=B.z;b[7]=B.w;b[8]=C.x;b[9]=C.y;b[10]=C.z;
    }`}var Xa=ma.truncationMetres,Za=.05,Qa=`
    uniform float eraDeposits[10];
    float eraTopFrom(float b[11],float g) {
      b[10]=g;
      for(int j=0;j<10;j++) b[j]=min(b[j],g-${Xa}*float(10-j));
      float y=b[0];
      for(int i=0;i<10;i++) y+=eraDeposits[i]*(b[i+1]-b[i]);
      return y;
    }
    float eraTopAt(vec3 s){float b[11]; eraBounds(s.xy,b); return eraTopFrom(b,s.z);}
    float eraTopGrid(vec2 xz){float b[11]; eraBounds(xz,b); return eraTopFrom(b,b[10]);}`,$a=`
    attribute vec3 eraSampleA; attribute vec3 eraSampleB; attribute float eraBlend;`,eo=Za,to=`
    float eraY=position.y;
    if(eraBlend>=0.0){
      eraY=mix(eraTopAt(eraSampleA),eraTopAt(eraSampleB),eraBlend);
      #ifdef ERA_TOP_NORMAL
      vec2 exz=mix(eraSampleA.xy,eraSampleB.xy,eraBlend);
      float gx=eraTopGrid(exz+vec2(${eo},0.0))-eraTopGrid(exz-vec2(${eo},0.0)), gz=eraTopGrid(exz+vec2(0.0,${eo}))-eraTopGrid(exz-vec2(0.0,${eo}));
      objectNormal=normalize(vec3(-gx/${2*Za},1.0,-gz/${2*Za}));
      #endif
    }`;function no({grid:e,uniforms:t}){let n=new Ve({depthPacking:de});return n.onBeforeCompile=n=>{Object.assign(n.uniforms,t),n.vertexShader=`${Ya(e)}${Qa}${$a}
      ${n.vertexShader}`.replace(`#include <begin_vertex>`,`#include <begin_vertex>
      if(eraBlend>=0.0) transformed.y=mix(eraTopAt(eraSampleA),eraTopAt(eraSampleB),eraBlend);`)},n.customProgramCacheKey=()=>`era-soil-m1-depth`,n}function ro(e){let t=e.nx*e.nz;return[0,1,2].map(n=>{let r=new Float32Array(t*4);for(let i=0;i<4;i++){let a=n*4+i;if(a>=ha)continue;let o=e.grids[a];for(let e=0;e<t;e++)r[e*4+i]=o[e]}let i=new V(r,e.nx,e.nz,Xe,De);return i.minFilter=i.magFilter=le,i.generateMipmaps=!1,i.needsUpdate=!0,i})}var io=ha-1,ao=ha,oo=(e,t,n)=>e*(1-n)+t*n;function so(e,t,n,r){let{nx:i,nz:a,xmin:o,zmin:s,stepMetres:c,grids:l}=e,u=Math.min(Math.max((t-o)/c,0),i-1),d=Math.min(Math.max((n-s)/c,0),a-1),f=Math.min(Math.floor(u),i-2),p=Math.min(Math.floor(d),a-2),m=u-f,h=d-p,g=p*i+f,_=g+1,v=g+i,y=v+1;for(let e=0;e<ha;e++){let t=l[e];r[e]=oo(oo(t[g],t[_],m),oo(t[v],t[y],m),h)}return r}function co(e,t,n,r,i){e[io]=t;for(let n=0;n<io;n++)e[n]=Math.min(e[n],t-Xa*(io-n));n[r]+=i*e[0];for(let t=0;t<io;t++)n[r+1+t]+=i*(e[t+1]-e[t])}function lo({stack:e}){let t=new WeakMap,n=new Float64Array(ha),r=null;function i(t,r){let{position:i,normal:a,eraSampleA:o,eraSampleB:s,eraBlend:c}=t.attributes,l=[];for(let e=0;e<c.count;e++)c.getX(e)>=0&&l.push(e);let u=new Float32Array(l.length*ao),d=r?new Float32Array(l.length*2*ao):null,f=Za;return l.forEach((t,r)=>{let i=c.getX(t);if(co(so(e,o.getX(t),o.getY(t),n),o.getZ(t),u,r*ao,1-i),i!==0&&co(so(e,s.getX(t),s.getY(t),n),s.getZ(t),u,r*ao,i),!d)return;let a=oo(o.getX(t),s.getX(t),i),l=oo(o.getY(t),s.getY(t),i),p=r*2*ao;for(let[t,r,i]of[[f,0,p],[0,f,p+ao]])so(e,a+t,l+r,n),co(n,n[io],d,i,1),so(e,a-t,l-r,n),co(n,n[io],d,i,-1)}),{moving:Int32Array.from(l),C:u,G:d,positions:Float32Array.from(i.array),normals:Float32Array.from(a.array),key:null}}function a(e,n=r){let a=e?.userData?.eraDisplaced;if(!a)return null;if(!n?.deposits)throw Error(`era displacement needs a state with deposits (call beginFrame or pass the applyState state)`);let o=e.geometry,s=ga(n.deposits),c=s.join(`,`),l=t.get(o);if(l||t.set(o,l=i(o,a===`top`)),l.key===c)return{positions:l.positions,normals:l.normals};let{moving:u,C:d,G:f,positions:p,normals:m}=l,h=2*Za;for(let e=0;e<u.length;e++){let t=u[e],n=e*ao,r=d[n];for(let e=0;e<io;e++)r+=s[e]*d[n+1+e];if(p[3*t+1]=r,!f)continue;let i=2*n,a=f[i],o=f[i+ao];for(let e=0;e<io;e++)a+=s[e]*f[i+1+e],o+=s[e]*f[i+ao+1+e];let c=-a/h,l=-o/h,g=Math.hypot(c,1,l);m[3*t]=c/g,m[3*t+1]=1/g,m[3*t+2]=l/g}return l.key=c,{positions:p,normals:m}}return{beginFrame(e){r=e},resolve:a}}var uo=Object.freeze({key:16773858,fill:15259328,sky:12235944,ground:7365455}),fo=.8,po=.3;Object.freeze({name:`loose top: flat patches, clods, darker patches`,mottle:.34,streak:0,streakThickness:.1,lump:.55,lumpPeriod:.1,speck:.25,patches:.12,darkPatches:.05,relief:.8}),Object.freeze({name:`trowelled excavation floor`,mottle:.9,streak:0,streakThickness:.1,lump:.5,lumpPeriod:.08,speck:.3,patches:.15,relief:1});var mo=e=>-(Math.PI/6)+Math.PI/3*(1-Math.cos(Math.PI*Math.max(0,Math.min(12,e))/12))/2,ho=Object.freeze({inner:[57,52,46],outer:[25,27,28],from:[256,205,15],to:[256,240,340],ditherSeed:60617}),go=Object.freeze({heightMetres:.2,outlineMetres:.034,centreBelowBaseMetres:.21,bone:14208699,grey:7695712}),_o=Object.freeze({radiusMetres:26,fadeMetres:[17,23]});function vo(e,t){let n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`),i=r.createImageData(e,t),a=Ri(ho.ditherSeed),[o,s,c]=ho.from,[l,u,d]=ho.to,f=l-o,p=u-s,m=d-c,h=f*f+p*p-m*m;for(let n=0;n<t;n++)for(let r=0;r<e;r++){let l=(r+.5)*512/e-o,u=(n+.5)*512/t-s,d=l*f+u*p+c*m,g=l*l+u*u-c*c,_=(d+Math.sqrt(Math.max(0,d*d-h*g)))/h;c+_*m<0&&(_=(d-Math.sqrt(Math.max(0,d*d-h*g)))/h),_=Math.min(1,Math.max(0,_));let v=(n*e+r)*4;for(let e=0;e<3;e++){let t=ho.inner[e]+(ho.outer[e]-ho.inner[e])*_+a()+a()-1;i.data[v+e]=Math.min(255,Math.max(0,Math.round(t)))}i.data[v+3]=255}r.putImageData(i,0,0);let g=new ke(n);return g.colorSpace=pe,g.minFilter=g.magFilter=le,g.generateMipmaps=!1,g}function yo(e,{eraDebug:t=null}={}){let n=new u(uo.sky,uo.ground,.4);e.add(n);let r=new j(uo.key,2);r.position.set(...aa),r.castShadow=!0,r.shadow.mapSize.set(2048,2048),Object.assign(r.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:110}),Object.assign(r.shadow,{radius:7,blurSamples:16,normalBias:.08,bias:-4e-4}),e.add(r);let i=new j(uo.fill,2.4);i.position.set(18,5,32),e.add(i);let a=new j(12895157,.3);return a.position.set(8,19,-25),e.add(a),String(t??``).split(`,`).includes(`nofill`)&&(n.intensity=i.intensity=a.intensity=0),{hemisphere:n,key:r,fill:i,rim:a}}function bo({scene:t,add:n,material:r,base:i,plinthColour:a,scaleBar:o=!0}){n(ia(25.3,.3,17.3,0,-i-.21,0),r(a),{role:`plinth`,receive:!1}),n(ia(25.24,.065,17.24,0,-i-.0325,0),r(3683887),{role:`plinth`,receive:!1});let s=go,c=-i-s.centreBelowBaseMetres;if(o){for(let e=0;e<5;e++)n(ia(1,s.heightMetres,.012,2.5+e,c,8.66),new ge({color:e%2?s.grey:s.bone}),{role:`scale`,cast:!1});for(let e=0;e<=5;e++)n(ia(s.outlineMetres,s.heightMetres+2*s.outlineMetres,.014,2+e,c,8.668),new ge({color:s.bone}),{role:`scale`,cast:!1});for(let e of[-1,1])n(ia(5+s.outlineMetres,s.outlineMetres,.015,4.5,c+e*(s.heightMetres+s.outlineMetres)/2,8.67),new ge({color:s.bone}),{role:`scale`,cast:!1})}let l=new Se({color:526602,opacity:.45});l.onBeforeCompile=e=>{e.vertexShader=`varying vec2 groundXZ;\n${e.vertexShader}`.replace(`#include <begin_vertex>`,`#include <begin_vertex>
groundXZ=(modelMatrix*vec4(position,1.0)).xz;`),e.fragmentShader=`varying vec2 groundXZ;\n${e.fragmentShader}`.replace(`gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );`,`gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) * (1.0 - smoothstep(${_o.fadeMetres[0].toFixed(1)}, ${_o.fadeMetres[1].toFixed(1)}, length(groundXZ))) );`)},l.customProgramCacheKey=()=>`faded-ground`;let u=new e(new He(_o.radiusMetres,128),l);return u.rotation.x=-Math.PI/2,u.position.y=-i-.38,u.receiveShadow=!0,u.userData.sectionRole=`ground`,t.add(u),u}var xo={type:`change`},So={type:`start`},Co={type:`end`},wo=new X,To=new me,Eo=Math.cos(70*I.DEG2RAD),Do=new g,Oo=2*Math.PI,ko={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Ao=1e-6,jo=class extends je{constructor(e,t=null){super(e,t),this.state=ko.NONE,this.target=new g,this.cursor=new g,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:`ArrowLeft`,UP:`ArrowUp`,RIGHT:`ArrowRight`,BOTTOM:`ArrowDown`},this.mouseButtons={LEFT:ae.ROTATE,MIDDLE:ae.DOLLY,RIGHT:ae.PAN},this.touches={ONE:ue.ROTATE,TWO:ue.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle=`auto`,this._domElementKeyEvents=null,this._lastPosition=new g,this._lastQuaternion=new W,this._lastTargetPosition=new g,this._quat=new W().setFromUnitVectors(e.up,new g(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ge,this._sphericalDelta=new Ge,this._scale=1,this._panOffset=new g,this._rotateStart=new d,this._rotateEnd=new d,this._rotateDelta=new d,this._panStart=new d,this._panEnd=new d,this._panDelta=new d,this._dollyStart=new d,this._dollyEnd=new d,this._dollyDelta=new d,this._dollyDirection=new g,this._mouse=new d,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=No.bind(this),this._onPointerDown=Mo.bind(this),this._onPointerUp=Po.bind(this),this._onContextMenu=Vo.bind(this),this._onMouseWheel=Lo.bind(this),this._onKeyDown=Ro.bind(this),this._onTouchStart=zo.bind(this),this._onTouchMove=Bo.bind(this),this._onMouseDown=Fo.bind(this),this._onMouseMove=Io.bind(this),this._interceptControlDown=Ho.bind(this),this._interceptControlUp=Uo.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e===`grab`?this.domElement.style.cursor=`grab`:this.domElement.style.cursor=`auto`}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener(`pointerdown`,this._onPointerDown),this.domElement.addEventListener(`pointercancel`,this._onPointerUp),this.domElement.addEventListener(`contextmenu`,this._onContextMenu),this.domElement.addEventListener(`wheel`,this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener(`keydown`,this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction=`none`}disconnect(){this.state=ko.NONE,this.domElement.removeEventListener(`pointerdown`,this._onPointerDown),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.domElement.removeEventListener(`pointercancel`,this._onPointerUp),this.domElement.removeEventListener(`wheel`,this._onMouseWheel),this.domElement.removeEventListener(`contextmenu`,this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener(`keydown`,this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener(`keyup`,this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction=``,this.domElement.style.cursor=`auto`}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(xo),this.update(),this.state=ko.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;Do.copy(t).sub(this.target),Do.applyQuaternion(this._quat),this._spherical.setFromVector3(Do),this.autoRotate&&this.state===ko.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(n)&&isFinite(r)&&(n<-Math.PI?n+=Oo:n>Math.PI&&(n-=Oo),r<-Math.PI?r+=Oo:r>Math.PI&&(r-=Oo),n<=r?this._spherical.theta=Math.max(n,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+r)/2?Math.max(n,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let i=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let e=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),i=e!=this._spherical.radius}if(Do.setFromSpherical(this._spherical),Do.applyQuaternion(this._quatInverse),t.copy(this.target).add(Do),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let e=null;if(this.object.isPerspectiveCamera){let t=Do.length();e=this._clampDistance(t*this._scale);let n=t-e;this.object.position.addScaledVector(this._dollyDirection,n),this.object.updateMatrixWorld(),i=!!n}else if(this.object.isOrthographicCamera){let t=new g(this._mouse.x,this._mouse.y,0);t.unproject(this.object);let n=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),i=n!==this.object.zoom;let r=new g(this._mouse.x,this._mouse.y,0);r.unproject(this.object),this.object.position.sub(r).add(t),this.object.updateMatrixWorld(),e=Do.length()}else console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.`),this.zoomToCursor=!1;e!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(e).add(this.object.position):(wo.origin.copy(this.object.position),wo.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(wo.direction))<Eo?this.object.lookAt(this.target):(To.setFromNormalAndCoplanarPoint(this.object.up,this.target),wo.intersectPlane(To,this.target))))}else if(this.object.isOrthographicCamera){let e=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),e!==this.object.zoom&&(this.object.updateProjectionMatrix(),i=!0)}return this._scale=1,this._performCursorZoom=!1,i||this._lastPosition.distanceToSquared(this.object.position)>Ao||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Ao||this._lastTargetPosition.distanceToSquared(this.target)>Ao?(this.dispatchEvent(xo),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e===null?Oo/60/60*this.autoRotateSpeed:Oo/60*this.autoRotateSpeed*e}_getZoomScale(e){let t=Math.abs(e*.01);return .95**(this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Do.setFromMatrixColumn(t,0),Do.multiplyScalar(-e),this._panOffset.add(Do)}_panUp(e,t){this.screenSpacePanning===!0?Do.setFromMatrixColumn(t,1):(Do.setFromMatrixColumn(t,0),Do.crossVectors(this.object.up,Do)),Do.multiplyScalar(e),this._panOffset.add(Do)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;Do.copy(r).sub(this.target);let i=Do.length();i*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*i/n.clientHeight,this.object.matrix),this._panUp(2*t*i/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.`),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),r=e-n.left,i=t-n.top,a=n.width,o=n.height;this._mouse.x=r/a*2-1,this._mouse.y=-(i/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Oo*this._rotateDelta.x/t.clientHeight),this._rotateUp(Oo*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Oo*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Oo*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Oo*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Oo*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(n,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(n,r)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyStart.set(0,i)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateEnd.set(n,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Oo*this._rotateDelta.x/t.clientHeight),this._rotateUp(Oo*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(n,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyEnd.set(0,i),this._dollyDelta.set(0,(this._dollyEnd.y/this._dollyStart.y)**+this.zoomSpeed),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new d,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Mo(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.ownerDocument.addEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.addEventListener(`pointerup`,this._onPointerUp)),this._isTrackingPointer(e)||(this._addPointer(e),e.pointerType===`touch`?this._onTouchStart(e):this._onMouseDown(e),this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grabbing`)))}function No(e){this.enabled!==!1&&(e.pointerType===`touch`?this._onTouchMove(e):this._onMouseMove(e))}function Po(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.dispatchEvent(Co),this.state=ko.NONE,this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grab`);break;case 1:let t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y})}}function Fo(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case ae.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=ko.DOLLY;break;case ae.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=ko.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=ko.ROTATE}break;case ae.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=ko.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=ko.PAN}break;default:this.state=ko.NONE}this.state!==ko.NONE&&this.dispatchEvent(So)}function Io(e){switch(this.state){case ko.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case ko.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case ko.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e)}}function Lo(e){this.enabled!==!1&&this.enableZoom!==!1&&this.state===ko.NONE&&(e.preventDefault(),this.dispatchEvent(So),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(Co))}function Ro(e){this.enabled!==!1&&this._handleKeyDown(e)}function zo(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case ue.ROTATE:if(this.enableRotate===!1){this.state=ko.NONE;break}this._handleTouchStartRotate(e),this.state=ko.TOUCH_ROTATE;break;case ue.PAN:if(this.enablePan===!1){this.state=ko.NONE;break}this._handleTouchStartPan(e),this.state=ko.TOUCH_PAN;break;default:this.state=ko.NONE}break;case 2:switch(this.touches.TWO){case ue.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=ko.TOUCH_DOLLY_PAN;break;case ue.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=ko.TOUCH_DOLLY_ROTATE;break;default:this.state=ko.NONE}break;default:this.state=ko.NONE}this.state!==ko.NONE&&this.dispatchEvent(So)}function Bo(e){switch(this._trackPointer(e),this.state){case ko.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case ko.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case ko.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case ko.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=ko.NONE}}function Vo(e){this.enabled!==!1&&e.preventDefault()}function Ho(e){e.key===`Control`&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}function Uo(e){e.key===`Control`&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}function Wo(e){let t=e.geometry.attributes.eraBlend;if(t){for(let e=0;e<t.count;e++)if(t.getX(e)>=0)return!0}return!1}function Go(t=()=>null,{requiresOverride:n=Wo}={}){let r=new WeakMap,i=0,a;function o(e,t,n){if(!(e instanceof Float32Array||e instanceof Float64Array)||e.length!==t*3)throw Error(`CPU audit ${n} must contain ${t*3} packed float values`)}function s(e,t,n){let r=e.getAttribute(t);r?(r.array=n,r.count=n.length/3,r.needsUpdate=!0):e.setAttribute(t,new G(n,3))}function c(c){let l=r.get(c);if(l?.frame===i&&l.source===c.geometry)return l.mesh;let u=t(c,a);if(!u){if(n(c))throw Error(`CPU audit requires displaced positions for ${c.name||c.type}`);return r.set(c,{frame:i,source:c.geometry,mesh:c}),c}if(c.isSkinnedMesh)throw Error(`CPU audit adapter does not support skinned overrides`);let d=c.geometry,f=d.attributes.position.count;o(u.positions,f,`positions`),u.normals&&o(u.normals,f,`normals`);let p=l?.mesh!==c&&l?.source===d?l.mesh:null;if(!p){let t=new J;p=c.isInstancedMesh?new h(t,c.material,c.count):new e(t,c.material)}let m=p.geometry;s(m,`position`,u.positions),u.normals?s(m,`normal`,u.normals):m.deleteAttribute(`normal`);for(let e of[`uv`,`uv1`])d.attributes[e]?m.setAttribute(e,d.attributes[e]):m.deleteAttribute(e);return m.setIndex(d.index),m.groups=d.groups.map(e=>({...e})),m.setDrawRange(d.drawRange.start,d.drawRange.count),m.boundingBox=null,m.boundingSphere=null,p.material=c.material,p.matrixWorld.copy(c.matrixWorld),p.layers.mask=c.layers.mask,c.isInstancedMesh&&(p.instanceMatrix=c.instanceMatrix,p.count=c.count,p.boundingBox=null,p.boundingSphere=null),r.set(c,{frame:i,source:d,mesh:p}),p}return{beginFrame(e){a=e,i++},meshFor:c,geometryFor:e=>c(e).geometry,intersect(e,t){let n=[];for(let r of t){if(!r.layers.test(e.layers))continue;let t=c(r),i=n.length;t.raycast(e,n);for(let e=i;e<n.length;e++)n[e].object=r}return n.sort((e,t)=>e.distance-t.distance)}}}var Ko=.75,qo=.75;function Jo(e,t){function n(e,t){if(t.length<3)return!1;let n=!1,r=!1;for(let i=0;i<t.length;i++){let a=t[i],o=t[(i+1)%t.length],s=(o.x-a.x)*(e.y-a.y)-(o.y-a.y)*(e.x-a.x);n||=s>1e-9,r||=s<-1e-9}return!(n&&r)}if(e.some(e=>n(e,t))||t.some(t=>n(t,e)))return 0;let r=1/0;for(let[n,i]of[[e,t],[t,e]])for(let e of n)for(let t=0;t<i.length;t++)r=Math.min(r,rt(e,i[t],i[(t+1)%i.length]));return r}function Yo(e,t,n){let r=e.map((e,t)=>t),i=e=>{for(;r[e]!==e;)r[e]=r[r[e]],e=r[e];return e},a=(e,t)=>{r[i(t)]=i(e)};for(let[e,n,r]of t)a(e,n),a(e,r);let o=new Map;for(let t=0;t<e.length;t++){let r=i(t);o.has(r)||o.set(r,{vertices:[],labels:new Set});let a=o.get(r);a.vertices.push(e[t]);for(let e of n[t])a.labels.add(e)}let s=[...o.values()].map(e=>({...e,hull:nt(e.vertices.map(e=>({x:e[0],y:e[2]})))})),c=s.map((e,t)=>t),l=e=>{for(;c[e]!==e;)c[e]=c[c[e]],e=c[e];return e};for(let e=0;e<s.length;e++)for(let t=e+1;t<s.length;t++)l(e)!==l(t)&&Jo(s[e].hull,s[t].hull)<=1.500000001&&(c[l(t)]=l(e));let u=new Map;for(let e=0;e<s.length;e++){let t=l(e);u.has(t)||u.set(t,{vertices:[],labels:new Set,componentCount:0});let n=u.get(t);for(let t of s[e].vertices)n.vertices.push(t);for(let t of s[e].labels)n.labels.add(t);n.componentCount++}return[...u.values()].map(e=>{let t={partLabels:[...e.labels].sort(),componentCount:e.componentCount,groundHull:nt(e.vertices.map(e=>({x:e[0],y:e[2]}))),pointCount:e.vertices.length};return Object.defineProperty(t,"vertices",{value:e.vertices}),t})}function Xo(e,t=!1){if(t||e<=.75)return 1;let n=Math.min(1,Math.max(0,(e-Ko)/qo));return 1-n*n*(3-2*n)}function Zo(e,{featureIdFor:t,featureAreaFor:n,strength:r=12e3,powers:i={},pools:a={},idleMapSize:o=512}={}){let s={},c=new Map(Object.entries(a));function l(e){let t=new Uint8Array(e*e*4);for(let e=3;e<t.length;e+=4)t[e]=255;let n=new V(t,e,e,Xe);return n.minFilter=n.magFilter=ie,n.needsUpdate=!0,n}Object.assign(s,i);let u=!0,d=[],f={},p=Array.from({length:2},(t,n)=>{let r=new Qe(16777215,0,0,.15,.5,2);return r.map=r.userData.ownMap=l(o),r.name=`callout-emphasis-`+n,r.castShadow=!1,e.add(r,r.target),r});function m(i,a){d=i,f=a;for(let o=0;o<2;o++){let d=p[o],f=i.find(e=>e.slot===o),m=f&&a?.[t(f)];if(d.intensity=0,f&&f.opacity>0&&m?.point){let i=t(f);if(!c.has(i)){let t=n?.(f,m);d.target.position.set(...t?.target||m.point),d.position.copy(d.target.position),t?.lightPosition?d.position.set(...t.lightPosition):d.position.add(new g(40,30,50)),d.angle=Math.max(.04,Math.atan((Math.hypot(t?.width||.7,t?.height||.7)/2+Ko+qo+1)/d.position.distanceTo(d.target.position))*2.4),e.updateMatrixWorld(!0),d.shadow.updateMatrices(d);let r=t?.groundY??m.point[1],a=d.shadow.camera,o=d.position,s=new g;function l(e,t){s.set(e,t,.5).unproject(a).sub(o);let n=(r-o.y)/s.y;return{x:o.x+s.x*n,y:o.z+s.z*n}}let u=t?.visibleVertices?.length?t.visibleVertices:t?.vertices,p;if(t?.clusters?.length)p=t.clusters.map(e=>nt(e.vertices.map(e=>(s.set(...e).project(a),{x:s.x,y:s.y}))).map(e=>l(e.x,e.y)));else if(u?.length)p=[nt(u.map(e=>(s.set(...e).project(a),{x:s.x,y:s.y}))).map(e=>l(e.x,e.y))];else{let e=t?.angle||0,n=Math.cos(e),r=Math.sin(e),i=(t?.width||.7)/2,a=(t?.height||.7)/2;p=[[[-i,-a],[i,-a],[i,a],[-i,a]].map(([e,t])=>({x:d.target.position.x+e*n-t*r,y:d.target.position.z+e*r+t*n}))]}let h=p.map(e=>{let t=0;for(let n=0;n<e.length;n++){let r=e[n],i=e[(n+1)%e.length];t+=r.x*i.y-i.x*r.y}return{hull:e,signed:t}}),_=new Uint8Array(1048576);for(let e=0;e<512;e++)for(let t=0;t<512;t++){let n=l((t+.5)/512*2-1,(e+.5)/512*2-1),r=0;for(let{hull:e,signed:t}of h){let i=e.length>=3,a=1/0;for(let r=0;r<e.length;r++){let o=e[r],s=e[(r+1)%e.length],c=s.x-o.x,l=s.y-o.y;(c*(n.y-o.y)-l*(n.x-o.x))*t<0&&(i=!1),a=Math.min(a,rt(n,o,s))}if(r=Math.max(r,Xo(a,i)),r===1)break}let i=Math.round(255*r),a=(e*512+t)*4;_[a]=_[a+1]=_[a+2]=i,_[a+3]=255}c.set(i,{bytes:_,position:d.position.toArray(),target:d.target.position.toArray(),angle:d.angle,hull:p.flat(),hulls:p,clusterCount:p.length,planeY:r,footprint:t?{...t}:null})}let a=c.get(i);d.position.set(...a.position),d.target.position.set(...a.target),d.angle=a.angle,d.userData.goboId!==i&&(a.texture?d.map=a.texture:(d.userData.ownMap.image.width!==512&&(d.userData.ownMap.dispose(),d.userData.ownMap=l(512)),d.map=d.userData.ownMap,d.map.image.data.set(a.bytes),d.map.needsUpdate=!0),d.userData.goboId=i,d.userData.pool={featureId:i,hull:a.hull,hulls:a.hulls||[a.hull],clusterCount:a.clusterCount||1,planeY:a.planeY,marginMetres:Ko,fadeMetres:qo}),d.intensity=u?(s[f.id]??r)*f.opacity:0}}e.updateMatrixWorld(!0)}return{lights:p,update:m,poolFor:e=>c.get(e),addPool(e,t){c.set(e,t)},exportPools:()=>Object.fromEntries(c),configure(e={}){e.enabled!==void 0&&(u=!!e.enabled),e.powers&&Object.assign(s,e.powers),m(d,f)},state:()=>p.map(e=>({name:e.name,type:e.type,intensity:e.intensity,visible:e.visible,castShadow:e.castShadow,penumbra:e.penumbra,angle:e.angle,mapSize:e.map.image.width,goboExteriorFadeMetres:qo,exteriorMarginMetres:Ko,pool:e.userData.pool,colour:e.color.toArray(),position:e.position.toArray(),target:e.target.position.toArray()}))}}function Qo(e,t,{fullGeometry:n=!1,clusters:r=!1}={}){let i=[],a=new g,o=new O,s=new O,c=[],l=[],u=[],d=new Map;for(let f of e.filter(e=>e.featureId===t))f.handle.object.traverse(e=>{if(!e.isMesh||!n&&!e.visible)return;let p=e.geometry.attributes.position,m=e.geometry.index,h=n?{start:0,count:1/0}:e.geometry.drawRange,g=Math.min(h.start+h.count,m?.count??p.count);for(let n=0;n<(e.isInstancedMesh?e.count:1);n++){e.isInstancedMesh?(e.getMatrixAt(n,o),s.multiplyMatrices(e.matrixWorld,o)):s.copy(e.matrixWorld);let _=[];for(let e=h.start;e<g;e++){a.fromBufferAttribute(p,m?m.getX(e):e).applyMatrix4(s);let n=[a.x,a.y,a.z];if(i.push(n),r){let e=n.map(e=>Math.round(e*1e5)).join(`,`);d.has(e)||(d.set(e,c.length),c.push(n),u.push(new Set));let r=d.get(e);u[r].add(f.part||f.key||t),_.push(r),_.length===3&&(l.push([..._]),_.length=0)}}}});if(!i.length)return null;let f=i.reduce((e,t)=>[e[0]+t[0]/i.length,e[1]+t[2]/i.length],[0,0]),p=0,m=0,h=0,_=-1/0;for(let[e,t,n]of i)p+=(e-f[0])**2,m+=(e-f[0])*(n-f[1]),h+=(n-f[1])**2,_=Math.max(_,t);let v=.5*Math.atan2(2*m,p-h),y=Math.cos(v),b=Math.sin(v),x=1/0,S=-1/0,C=1/0,w=-1/0;for(let[e,,t]of i){let n=e*y+t*b,r=-e*b+t*y;x=Math.min(x,n),S=Math.max(S,n),C=Math.min(C,r),w=Math.max(w,r)}let T=(x+S)/2,E=(C+w)/2,D={target:[T*y-E*b,_,T*b+E*y],maxY:_,width:S-x,height:w-C,angle:v};return Object.defineProperty(D,"vertices",{value:i}),r&&(D.clusters=Yo(c,l,u),D.nativePartCount=e.filter(e=>e.featureId===t).length,D.clusterCount=D.clusters.length,D.connectedComponentCount=D.clusters.reduce((e,t)=>e+t.componentCount,0)),D}function $o(e,{poolCatalog:t={pools:{},fieldHashes:{},manifest:{}},onProgress:n=()=>{},displaceInWorker:r=!1}={}){let i=e.eraSite?.();if(!i||!e.eraBlock||typeof e.applyState!=`function`||typeof e.eraDisplacement?.resolve!=`function`)throw Error(`Site requires the real era backend, anchors and CPU displacement`);let a=Go((t,n)=>e.eraDisplacement.resolve(t,n)),o=new Set,s=new WeakMap,c=new WeakMap,l=null,u=null,d=null,f=0,p=!1,m=`exact`,h=typeof e.refineAnchors==`function`,g=[],_=0,v=t=>{let n=typeof e.anchorStatus==`function`?e.anchorStatus():null;return!!n?.tableKey&&n.tableKey===Ia(t)};function y(t,{anchors:n=`exact`}={}){if(p)throw Error(`Site backend disposed`);if(!Array.isArray(t.deposits)||!Array.isArray(t.features)||t.deposits.length!==10||t.features.length!==10||![...t.deposits,...t.features,t.excavation].every(Number.isFinite))throw Error(`Invalid site scene state`);let r=h&&n===`nearest`?`nearest`:`exact`,i=JSON.stringify([t.deposits,t.features,t.excavation,t.eraIndex]);if(i===l&&(r===`nearest`||m===`exact`))return d;let o=performance.now(),s=r===`nearest`?e.applyState(structuredClone(t),{anchors:`nearest`}):e.applyState(structuredClone(t));if(!s.activeTopAnchor?.point||!s.featureAnchors)throw Error(`Real site backend did not return native anchors`);u=structuredClone(t),a.beginFrame(u),e.scene.updateMatrixWorld(!0),l=i,f++;let c=r===`nearest`&&v(t);return c&&_++,m=c?`exact`:r,d={...s,activeTopY:s.activeTopAnchor.point[1],stateRevision:f,tableHit:c},g.push({mode:r,ms:performance.now()-o}),g.length>600&&g.shift(),d}async function b({signal:t}={}){if(!h||m===`exact`||p)return null;let n=l,r=await e.refineAnchors({signal:t});return r&&!p&&l===n&&m===`nearest`?{key:n,exact:r}:null}function x(e){return!e||e.key!==l||m!==`nearest`?null:(f++,m=`exact`,d={...e.exact,activeTopY:e.exact.activeTopAnchor.point[1],stateRevision:f},d)}let S=(e,t)=>{if(!e.length)return null;let n=[...e].sort((e,t)=>e-t);return n[Math.min(n.length-1,Math.floor(t*n.length))]};function C(){let e=g.filter(e=>e.mode===`nearest`).map(e=>e.ms),t=g.filter(e=>e.mode===`exact`).map(e=>e.ms);return{nearest:{count:e.length,p50Ms:S(e,.5),p95Ms:S(e,.95),maxMs:e.length?Math.max(...e):null},exact:{count:t.length,p95Ms:S(t,.95),maxMs:t.length?Math.max(...t):null},nearestTableHits:_}}function w(e){let t=d?.featureAnchors[e];return t?.point?.length===3&&t.point.every(Number.isFinite)?{...t,point:[...t.point],visible:t.visible!==!1&&t.revealed!==!1}:null}function T(){if(!u)throw Error(`Apply a site state before requesting occluders`);e.scene.updateMatrixWorld(!0);let t=[];function n(e,r=!0,i=``){if(r&&=e.visible,r){i=e.userData.sectionRole||i,e.isMesh&&i!==`ground`&&e.geometry.attributes.position?.count>=3&&e.geometry.drawRange.count>=3&&(Array.isArray(e.material)?e.material:[e.material]).some(e=>e.visible&&e.opacity!==0)&&t.push({node:e,role:i});for(let t of e.children)n(t,r,i)}}return n(e.scene),t}let E=e=>r?e.userData?.eraDisplaced??null:null;function D({node:e,role:t},n){if(E(e))return n.set(e,t),e;let r=a.meshFor(e),i=s.get(e);return i&&i!==r.geometry&&(i.dispose(),o.delete(i)),r!==e&&(o.add(r.geometry),s.set(e,r.geometry)),n.set(r,t),r}let O=null;function ee(){let e=new WeakMap,t=T().map(t=>D(t,e));return c=e,t}async function te({valid:e=()=>!0,budgetMs:t=8,yieldTask:n=()=>new Promise(e=>setTimeout(e,0))}={}){let r=T(),i=new WeakMap,a=[],o=f,s=performance.now(),l=s,u=1,d=0,m=0,h=null;for(let s of r){if(a.length&&performance.now()-l>=t){if(d=Math.max(d,performance.now()-l),await n(),!e()||f!==o||p)return null;l=performance.now(),u++}let r=performance.now();a.push(D(s,i));let c=performance.now()-r;c>m&&(m=c,h=s.node.name||s.node.uuid)}return d=Math.max(d,performance.now()-l),c=i,O={meshes:a.length,totalMs:+(performance.now()-s).toFixed(1),slices:u,maxSliceMs:+d.toFixed(1),maxMeshMs:+m.toFixed(1),maxMesh:h},a}return n({phase:`anchors`,source:`provider static table with native fallback`}),{kind:`real-era`,base:e.eraBlock.base,top:e.eraBlock.top,bottomY:e.eraBlock.bottomY,applyState:y,setYear:e=>y(it(e)),setEra(e){if(!Number.isInteger(e)||e<0||e>9)throw Error(`Invalid era`);let t=Array.from({length:10},(t,n)=>Number(n<=e));return y({schemaVersion:1,eraIndex:e,deposits:t,features:[...t],excavation:0})},marker:w,occluders:ee,occludersSliced:te,occluderStats:()=>O,displacedKind:E,appliedDeposits:()=>u?[...u.deposits]:null,displacedMeshes(){let t=[];return e.scene.traverse(e=>{e.isMesh&&E(e)&&t.push(e)}),t},poolCatalog:t,roleOf:e=>c.get(e)||``,interactiveAnchors:h,refineAnchors:b,commitAnchors:x,anchorMode:()=>m,prepareAnchors:t=>typeof e.prepareAnchors==`function`?e.prepareAnchors(t):Promise.resolve(null),anchorStatus:()=>typeof e.anchorStatus==`function`?e.anchorStatus():null,applyReport:C,markerRecord(e){let t=d?.featureAnchors[e];return t?{...t,point:t.point?[...t.point]:null}:null},footprint:e=>t.pools[e]?.footprint||Qo(i.items,e,{fullGeometry:!0,clusters:!0}),isResident:t=>typeof e.isResident!=`function`||e.isResident(t),ensureState:t=>typeof e.ensureState==`function`?Promise.resolve(e.ensureState(structuredClone(t))):Promise.resolve(),warmState:t=>e.warmState(t),metadata:()=>({backend:`real-era`,placeholderAnchors:!1,anchorMode:m,anchorSource:`provider src/eras/anchor-table.js; native fallback for uncached interpolated states`,stateRevision:f,cpuDisplacement:!0,geometrySource:`current native import tree; pending accepted M2/P2 rebase`,poolSceneSource:t.manifest.sceneRoot||null,poolSourceLayoutSHA256:t.manifest.sourceLayoutSHA256||null,poolFieldHashes:t.fieldHashes,poolSourceVerifiedAgainstProvider:!1,resident:e.metadata?.()?.resident??null}),dispose(){p=!0;for(let e of o)e.dispose();o.clear()}}}function es(e,{pools:t={},catalog:n=null,onPoolReady:r=()=>{},powers:i={},anchorFor:a,visible:o=()=>!0,strength:s=0}={}){let c=Zo(e,{pools:t,powers:i,strength:s,featureIdFor:e=>e.featureId,idleMapSize:n?1:512}),l=Array.from({length:2},(e,t)=>({slot:t,id:null,opacity:0,anchor:null})),u=new Set(Object.keys(t)),d=null,f=null,p=!1;function m(e){let t=n?.get(e);return t&&!u.has(e)&&(c.addPool(e,t),u.add(e)),u.has(e)}function h(e){if(f=null,e&&!m(e)&&n?.has(e)&&(f=e,n.ensure(e).then(()=>{p||(m(e),f===e&&h(e),r(e))},t=>{f===e&&(f=null),console.warn(`Pool field unavailable`,e,t)})),d=e&&u.has(e)?e:null,d&&!l.some(e=>e.id===d)){let e=[...l].sort((e,t)=>e.opacity-t.opacity)[0];e.id=d,e.opacity=0,e.anchor=null}}function g(e=1/60,{immediate:t=!1}={}){let n=!1,r={},i=[];for(let s of l){if(!s.id)continue;let c=a(s.id);c?.point&&c.visible!==!1&&(s.anchor=c);let l=s.id===d&&c?.visible!==!1&&c?.point&&o(s.id)?Math.max(0,Math.min(1,c.opacity??1)):0,u=t?l:s.opacity+(l-s.opacity)*(1-Math.exp(-Math.max(0,e)/.09));s.opacity=Math.abs(u-l)<5e-4?l:u,n||=s.opacity!==l,s.anchor&&(r[s.id]=s.anchor),i.push({id:s.id,featureId:s.id,slot:s.slot,opacity:s.opacity})}return c.update(i,r),n}return{setActive:h,update:g,metadata:()=>({activeFeature:d,pendingPool:f,entries:l.map(({id:e,slot:t,opacity:n})=>({id:e,slot:t,opacity:n})),lights:c.state()}),dispose(){p=!0;for(let t of c.lights)e.remove(t,t.target),t.userData.ownMap.dispose()}}}function ts(e,t,n){let{x:r,y:i,width:a,height:o}=t;if(e.length!==a*o||r<0||i<0||r+a>n||i+o>n)throw Error(`Pool crop differs`);let s=new Uint8Array(n*n*4);for(let e=3;e<s.length;e+=4)s[e]=255;for(let t=0;t<o;t++)for(let o=0;o<a;o++){let c=e[t*a+o],l=((i+t)*n+r+o)*4;s[l]=s[l+1]=s[l+2]=c}return s}var ns=`site-pools-m2b/`,rs=`film-emphasis-m2b/`,is=e=>Array.from(new Uint8Array(e),e=>e.toString(16).padStart(2,`0`)).join(``);function as(e,t){let n=new V(e,t,t,Xe);return n.minFilter=n.magFilter=ie,n.generateMipmaps=!1,n.colorSpace=``,n.needsUpdate=!0,n}var os=()=>new Promise(e=>globalThis.requestIdleCallback?requestIdleCallback(()=>e(),{timeout:1e3}):setTimeout(e,0));async function ss({baseURL:e=globalThis.document?.baseURI,fetcher:t=globalThis.fetch.bind(globalThis),source:n=`site`,clock:r=()=>performance.now(),onTask:i=()=>{},idle:a=os}={}){if(![`site`,`film`].includes(n))throw Error(`Unknown pool source `+n);let o=n===`film`?rs:ns,s=new URL(o,e),c=r(),l=await t(new URL(`manifest.json`,s),{cache:`no-cache`});if(!l.ok)throw Error(`Pool manifest: HTTP ${l.status}`);let u=await l.json();if(n===`site`&&u.format!==`r8-crop`)throw Error(`Pool manifest: unknown format `+u.format);i({name:`pool-manifest`,source:n,durationMs:r()-c});let d={},f={},p={},m=new Map,h={},g=0,_=!1;for(let[e,t]of Object.entries(u.fields))d[e]={...t},f[e]=t.sha256;async function v(e){let a=u.fields[e],o=r(),c=await t(new URL(a.file,s)),l=t=>Object.assign(Error(`Pool field ${e}: ${t}`),{pool:e,pack:`pool:`+e});if(!c.ok)throw l(`HTTP `+c.status);let d=await c.arrayBuffer();if(is(await crypto.subtle.digest(`SHA-256`,d))!==a.sha256)throw l(`hash differs`);let f,m=r();if(n===`site`)f=ts(new Uint8Array(d),a.crop,u.size);else{if(d.byteLength!==u.size*u.size*4)throw l(`byte count differs`);f=new Uint8Array(d)}let{file:v,sha256:y,sourceFile:b,sourceSHA256:x,crop:S,uvTransform:C,...w}=a,T={...w,texture:as(f,u.size),fieldSHA256:a.sha256};if(i({name:`pool-expand`,featureId:e,startTimeMs:m,durationMs:r()-m}),_)throw T.texture.dispose(),l(`catalogue disposed`);return g+=d.byteLength,p[e]=T,delete h[e],i({name:`pool-field`,featureId:e,bytes:d.byteLength,startTimeMs:o,durationMs:r()-o}),T}function y(e){if(p[e])return Promise.resolve(p[e]);if(!u.fields[e])return Promise.reject(Error(`Unknown pool `+e));if(!m.has(e)){let t=v(e).finally(()=>m.delete(e));t.catch(t=>{h[e]=t.message}),m.set(e,t)}return m.get(e)}let b=0;return{pools:p,records:d,fieldHashes:f,manifest:u,source:n,directory:o,has:e=>!!u.fields[e],isResident:e=>!!p[e],get:e=>p[e]??null,ensure:y,ensureAll:e=>Promise.all(e.map(y)).then(()=>{}),async prefetch(e){let t=r();for(let t of e){if(_)return;if(!p[t]){if(await a(),_)return;await y(t).then(()=>b++,()=>{})}}i({name:`pool-prefetch`,count:b,durationMs:r()-t})},metadata:()=>({source:n,directory:o,format:u.format??`rgba`,size:u.size,total:Object.keys(u.fields).length,loaded:Object.keys(p),pending:[...m.keys()],failed:{...h},bytesFetched:g,prefetched:b}),dispose(){_=!0;for(let e of Object.values(p))e.texture.dispose()}}}var cs=`m2b-ten-era, ring and drain calibrated`,ls=Object.freeze({"pre-pgw":7877.684183918016,"pre-soil":8979.895581912164,"maur-rings":3985.876317235875,"maur-drain":4860.732469236813,"sunga-wall":5909.603787417596,"sunga-patches":6387.24703278821,"kushan-rooms":6719.413882517055,"kushan-brick":5184.496470667498,"gupta-floors":6675.366509675166,"gupta-wall":1170.3947185286065,"post-ns":5989.344998975765,"post-ew":7430.686517234645,"rajput-width":7671.1202379319175,"rajput-holes":847.097176594061,"sultanate-corner":3144.4416936725065,"sultanate-floor":5175.710631389879,"mughal-porcelain":9631.453960159757,"mughal-glass":10475.404468433448,"modern-1948":5694.696661423665,"modern-1955":14235.070031945937});Object.freeze({"pre-pgw":7877.684183918016,"pre-soil":8979.895581912164,"maur-rings":0,"maur-drain":5520.237686077203,"sunga-wall":5909.603787417596,"sunga-patches":7739.886222325687,"kushan-rooms":6714.589106299321,"kushan-brick":5184.496470667498,"gupta-floors":6952.087180481976,"gupta-wall":1204.0251712109468,"post-ns":5989.344998975765,"post-ew":7430.686517234645,"rajput-width":7779.633546857067,"rajput-holes":738.8530079417166,"sultanate-corner":2143.0938107854504,"sultanate-floor":6635.297295742721,"mughal-porcelain":10340.692416651042,"mughal-glass":10433.198106740001,"modern-1948":5706.377186370766,"modern-1955":14235.070031945937}),Object.freeze({"pre-pgw":7877.684183918016,"pre-soil":8979.895581912164,"maur-rings":4768.65433947115,"maur-drain":2881.7314040601605,"sunga-wall":5909.603787417596,"sunga-patches":6387.24703278821,"kushan-rooms":6719.413882517055,"kushan-brick":5184.496470667498,"gupta-floors":6675.366509675166,"gupta-wall":1170.3947185286065,"post-ns":5989.344998975765,"post-ew":7430.686517234645,"rajput-width":7671.1202379319175,"rajput-holes":847.097176594061,"sultanate-corner":3144.4416936725065,"sultanate-floor":5175.710631389879,"mughal-porcelain":9834.992440450142,"mughal-glass":10669.936836642632,"modern-1948":5694.696661423665,"modern-1955":14235.070031945937});function us({isResident:e=()=>!0,ensureState:t=()=>Promise.resolve(),onReady:n=()=>{},onNote:r=()=>{},noteDelayMs:i=150,setTimer:a=setTimeout,clearTimer:o=clearTimeout}={}){let s=0,c=null,l=null,u=null,d=null,f=e=>JSON.stringify([e.deposits,e.features,e.excavation,e.eraIndex]);function p(e){e!==d&&(d=e,r(d,l?.error??null))}function m(){u!==null&&(o(u),u=null)}function h(){m(),c=null}function g(r){if(e(r))return(c!==null||l)&&(s++,h(),l=null,p(null)),!0;let o=f(r);if(l?.key===o||c===o)return!1;let m=++s;return c=o,l=null,d===`failed`&&p(null),u===null&&d!==`loading`&&(u=a(()=>{u=null,c!==null&&p(`loading`)},i)),Promise.resolve().then(()=>t(structuredClone(r))).then(()=>{m===s&&(h(),p(null),n())},e=>{m===s&&(h(),l={key:o,error:e},p(`failed`))}),!1}return{check:g,retry(){return l?(l=null,p(null),n(),!0):!1},metadata:()=>({pending:c!==null,note:d,failed:l?{pack:l.error?.pack??null,message:String(l.error?.message??l.error)}:null,requests:s})}}var ds=e=>0;function fs(e){return e.eraBlock&&typeof e.warmState==`function`?{backend:`scene-kit`,warmState:e.warmState.bind(e)}:{backend:`stub`,warmState:ds}}function ps(e,{idle:t=e=>globalThis.requestIdleCallback?requestIdleCallback(e,{timeout:2e3}):setTimeout(e,0),clock:n=()=>performance.now(),onTask:r=()=>{}}={}){return new Promise((i,a)=>{let o=[],s=0;function c(){t(()=>{let t=et[s],l=n();try{let a=e(it(t)),u=typeof a==`number`?a:a?.totalMs,d={name:`excavation-warm`,year:t,cutStep:s*4,startTimeMs:l,durationMs:n()-l,...Number.isFinite(u)?{backendDurationMs:u}:{}};o.push(d),r(d),s++,s<et.length?c():i(o)}catch(e){a(e)}})}c()})}function ms(){let e=[],t=[],n=n=>{e.push(n),n.durationMs>50&&t.push(n)},r;return globalThis.PerformanceObserver?.supportedEntryTypes?.includes(`longtask`)&&(r=new PerformanceObserver(e=>e.getEntries().forEach(e=>n({name:e.name,source:`browser-longtask`,startTimeMs:e.startTime,durationMs:e.duration}))),r.observe({type:`longtask`,buffered:!0})),{record:n,report:()=>({tasks:[...e],longTasksOver50ms:[...t]}),dispose:()=>r?.disconnect()}}async function hs({refine:e,signal:t,isCurrent:n}){let r=null,i=null;try{r=await e({signal:t})}catch(e){i=e}return t.aborted||!n()?{outcome:`superseded`,failure:i}:r?{outcome:`commit`,refined:r}:{outcome:`fallback`,failure:i}}function gs(e=!1){let t=35*Math.PI/180,n=27*Math.PI/180,r=e?104:74,i=[-1.4,-3.85,0];return{target:i,distance:r,position:[i[0]+r*Math.cos(n)*Math.sin(t),i[1]+r*Math.sin(n),i[2]+r*Math.cos(n)*Math.cos(t)]}}function _s(e=location.search,t=globalThis.__STRATA_SITE_DIAGNOSTIC__){return new URLSearchParams(e).has(`diagnose`)&&t||{}}function vs(e){let t=e.getContext(),n=t.getExtension(`WEBGL_debug_renderer_info`);return{unmaskedRenderer:t.getParameter(n?n.UNMASKED_RENDERER_WEBGL:t.RENDERER),samples:t.getParameter(t.SAMPLES)}}function ys(e,t){let n={requested:t,shadows:[],heaviestMaterial:null};if(!Object.keys(t).length)return n;if(t.halfShadows&&e.scene.traverse(e=>{if(!e.isLight||!e.castShadow||!e.shadow)return;let t=[e.shadow.mapSize.x,e.shadow.mapSize.y];e.shadow.map?.dispose(),e.shadow.mapPass?.dispose(),e.shadow.map=null,e.shadow.mapPass=null,e.shadow.mapSize.set(Math.max(1,Math.floor(t[0]/2)),Math.max(1,Math.floor(t[1]/2))),e.shadow.needsUpdate=!0,n.shadows.push({before:t,after:[e.shadow.mapSize.x,e.shadow.mapSize.y]})}),t.plainHeaviest){let t=new Map,r=[];e.scene.traverse(e=>{if(!e.isMesh||!e.visible||!e.geometry||!e.material)return;r.push(e);let n=Array.isArray(e.material)?e.material:[e.material],i=Array.isArray(e.material)&&e.geometry.groups.length?e.geometry.groups:[{materialIndex:0,count:e.geometry.index?.count||e.geometry.attributes.position.count}];for(let r of i){let i=n[r.materialIndex];if(!i)continue;let a=t.get(i)||{material:i,triangles:0,roles:new Set};a.triangles+=r.count/3,a.roles.add(e.userData.sectionRole||e.name||`mesh`),t.set(i,a)}});let i=[...t.values()].sort((e,t)=>t.triangles-e.triangles)[0];if(i){let e=i.material,t=new ge({color:e.color?.clone()||new H(8947848),map:e.map,vertexColors:e.vertexColors,side:e.side,transparent:e.transparent,opacity:e.opacity,depthTest:e.depthTest,depthWrite:e.depthWrite,clippingPlanes:e.clippingPlanes,clipShadows:e.clipShadows});for(let n of r)n.material=Array.isArray(n.material)?n.material.map(n=>n===e?t:n):n.material===e?t:n.material;n.heaviestMaterial={name:e.name||e.type,triangles:i.triangles,roles:[...i.roles],replacement:`MeshBasicMaterial`,selection:`largest sum of submitted triangles using one material`}}}return n}var bs=e=>Math.min(Number.isFinite(e)&&e>0?e:1,2);function xs(e,{request:t=e=>requestAnimationFrame(e),cancel:n=e=>cancelAnimationFrame(e)}={}){let r=0,i=!1,a=!1,o=!1,s=0;function c(){!r&&!a&&!o&&i&&(r=t(l))}function l(t){if(r=0,!a){i=!1,o=!0;try{e(t),s++}finally{o=!1,c()}}}return{invalidate(){i=!0,c()},pause(){a=!0,r&&n(r),r=0},resume(){a=!1,c()},metadata:()=>({pendingFrame:!!r,dirty:i,paused:a,frames:s})}}function Ss(e,{setTimer:t=(e,t)=>setTimeout(e,t),clearTimer:n=e=>clearTimeout(e),now:r=()=>performance.now(),interactionRatio:i=1,restoreDelay:a=150}={}){let o=new Set,s,c=!1,l=null,u=null,d=i;function f(){s!==void 0&&n(s),s=void 0}function p(t){c!==t&&(c=t,t||(u=r()),e())}function m(e=a){f(),o.size||(s=t(()=>{s=void 0,o.size||p(!1)},e))}return{begin(e){o.add(e),u=null,f(),p(!0)},end(e,t){o.delete(e),o.size||(l=r()),m(t)},pulse(){f(),l=r(),u=null,p(!0),m()},ratio:e=>c?Math.min(e,i):e,isActive:e=>o.has(e),inputActive:()=>o.size>0,setInteractionRatio(t){i=t===void 0?d:t,c&&e()},metadata:()=>({interacting:c,activeInputs:[...o],interactionPixelRatio:i,restoreDelayMs:a,lastRestorationDelayMs:l!==null&&u!==null?u-l:null})}}function Cs({worker:e=new Worker(new URL(`/purana-qila-in-layers/assets/occlusion.worker-7JwnK0Gz.js`,``+import.meta.url),{type:`module`}),clock:t=()=>performance.now(),onTask:n=()=>{},displacedKind:r=()=>null}={}){let i=new WeakMap,a=new Map,o=0,s=0,c={builds:0,refits:0,queries:0,workerMs:0},l=0;e.onmessage=({data:e})=>{let t=a.get(e.id);if(t){if(a.delete(e.id),e.error)t.reject(Error(e.error));else{let{silhouette:n,visible:r,memory:i,...a}=e.result;`builds`in a&&(c=a),t.resolve(e.result)}}},e.onerror=e=>{for(let t of a.values())t.reject(Error(e.message));a.clear()};function u(t,n,r=[]){return new Promise((i,s)=>{let c=++o;a.set(c,{resolve:i,reject:s});try{e.postMessage({id:c,type:t,data:n},r)}catch(e){a.delete(c),s(e)}})}let d=e=>{if(!Array.isArray(e)||e.length!==10)throw Error(`Displaced occluders need the applied deposits`);return[...e]};function f(e){return{position:e.attributes.position,positionCount:e.attributes.position.count,version:e.attributes.position.version,index:e.index,indexVersion:e.index?.version,groups:JSON.stringify(e.groups),start:e.drawRange.start,count:e.drawRange.count}}let p=(e,t)=>e&&Object.keys(t).every(n=>e[n]===t[n]),m=(e,t)=>e&&[`index`,`indexVersion`,`groups`,`start`,`count`,`positionCount`].every(n=>e[n]===t[n]);function h(e){let t=i.get(e);return t||(t={id:++s},i.set(e,t),e.addEventListener?.(`dispose`,()=>{i.delete(e),u(`release`,{geometryId:t.id}).catch(()=>{})}),t)}async function g(e){let r=h(e),i=f(e);if(p(r.revision,i))return r.id;if(r.pending)return await r.pending,g(e);let a=t(),o=i.position,s;if(o.isInterleavedBufferAttribute){s=new Float32Array(o.count*3);for(let e=0;e<o.count;e++)s.set([o.getX(e),o.getY(e),o.getZ(e)],e*3)}else s=o.array.slice();let c=m(r.revision,i)?`refit`:`build`,d={geometryId:r.id,positions:s},_=[s.buffer];c===`build`&&(d.index=e.index?.array.slice(),d.index&&_.push(d.index.buffer),d.groups=e.groups.map(e=>({...e})),d.drawRange={...e.drawRange}),r.pending=u(c,d,_).then(()=>{r.revision=i}).finally(()=>{r.pending=null});let v=t()-a;return l=Math.max(l,v),n({name:`occlusion-copy`,startTimeMs:a,durationMs:v}),await r.pending,g(e)}let _=[`position`,`eraSampleA`,`eraSampleB`,`eraBlend`];function v(e){let i=e.geometry,a=h(i);if(a.registered)return a.registered;let o=t(),s={},c=[];for(let e of _){let t=i.attributes[e];if(!t)throw Error(`Displaced occluder lacks `+e);let n=t.array.slice();s[e]={array:n,itemSize:t.itemSize},c.push(n.buffer)}let d=i.index?.array.slice();d&&c.push(d.buffer),a.registered=u(`register`,{geometryId:a.id,kind:r(e),attributes:s,index:d,groups:i.groups.map(e=>({...e})),drawRange:{...i.drawRange}},c),a.registered.catch(()=>{a.registered=null});let f=t()-o;return l=Math.max(l,f),n({name:`occlusion-register`,startTimeMs:o,durationMs:f}),a.registered}function y(e,t,n){return e.map(e=>({geometryId:i.get(e.geometry)?.id,...r(e)?{deposits:d(n)}:{},matrixWorld:e.matrixWorld.toArray(),materialArray:Array.isArray(e.material),role:t?.(e)||``,materials:(Array.isArray(e.material)?e.material:[e.material]).map(e=>({side:e.side,visible:e.visible,opacity:e.opacity,clipIntersection:!!e.clipIntersection,planes:(e.clippingPlanes||[]).map(e=>[e.normal.x,e.normal.y,e.normal.z,e.constant])})),...e.isInstancedMesh?{instances:e.instanceMatrix.array.slice(),count:e.count}:{}}))}return{async prepare(e){let t=new Set;for(let n of e)t.has(n.geometry)||(t.add(n.geometry),r(n)?await v(n):await g(n.geometry))},loadStack:e=>u(`load-stack`,{base:e}),async warm(e,t){return await v(e),u(`warm`,{geometryId:i.get(e.geometry).id,deposits:d(t)})},memory:()=>u(`memory`,{}).then(e=>e.memory),async query(e,r,{deposits:i}={}){let a=t(),o=u(`query`,{meshes:y(e,void 0,i),rays:r}),s=t()-a;return l=Math.max(l,s),n({name:`occlusion-query-submit`,startTimeMs:a,durationMs:s}),(await o).visible},async silhouette(e,{roleOf:r,camera:i,width:a,height:o,cell:s=4,deposits:c}){let d=t(),f=u(`silhouette`,{meshes:y(e,r,c),projectionMatrix:i.projectionMatrix.toArray(),matrixWorldInverse:i.matrixWorldInverse.toArray(),width:a,height:o,cell:s}),p=t()-d;return l=Math.max(l,p),n({name:`silhouette-submit`,startTimeMs:d,durationMs:p}),(await f).silhouette},metadata:()=>({...c,pendingOperations:a.size,maximumMainTaskMs:l}),dispose(){e.terminate();for(let e of a.values())e.reject(Error(`Occlusion worker disposed`));a.clear()}}}function ws({query:e,commit:t,preview:n=()=>{},blocked:r=()=>!1,onError:i=e=>console.error(e),defer:a=null}){let o=0,s=-1,c=null,l=0,u=null;return{invalidate(){o++,u=null},update(){if(r()){l++;return}if(s===o||c?.revision===o)return;let d={revision:o};c=d;let f=()=>d.revision===o&&!r(),p=e=>{f()&&n(e)};(a?new Promise(e=>a(e)):Promise.resolve()).then(()=>f()?e(f,p):null).then(e=>{e!==null&&f()&&(t(e),s=d.revision)},e=>{u=e.message,i(e)}).finally(()=>{c===d&&(c=null)})},metadata:()=>({pending:s!==o||!!c,revision:o,committedRevision:s,skippedInteractiveUpdates:l,error:u})}}function Ts({anchor:e,featureOpacity:t=0,projected:n,workerVisible:r}){return t<=.03||e?.revealed===!1?{reason:`unrevealed`,detail:`Era/feature reveal has not reached this marker`,eligible:!1}:e?e.visible===!1?{reason:`occluded`,detail:`Native exposure/anchor table marks the feature hidden by soil or cuts`,eligible:!1}:!e.point?.length||!n?{reason:`missing-native-anchor`,detail:`Visible native anchor has no finite point`,eligible:!1}:Math.abs(n.x)>.95||Math.abs(n.y)>.95||Math.abs(n.z)>1?{reason:`off-screen`,detail:`Native anchor lies outside the marker viewport margin`,eligible:!1}:r===void 0?{reason:`pending-occlusion`,detail:`Awaiting current-state worker ray result`,eligible:!0}:r?{reason:`visible`,detail:`Revealed, exposed, in-frame and worker ray clear`,eligible:!0}:{reason:`occluded`,detail:`Current-state CPU-displaced worker ray is blocked`,eligible:!0}:{reason:`missing-native-anchor`,detail:`Provider did not return an anchor record`,eligible:!1}}var Es=Object.freeze({lengthMetres:5,plinthClearanceMetres:1.5,groundLiftMetres:.002,fade:Object.freeze([.45,.6]),labelCapMinPx:10,labelGapMinPx:4}),Ds=go.outlineMetres,Os=go.heightMetres;function ks({plinth:e,groundY:t}){let n=(e.min.x+e.max.x)/2,r=e.max.z,i=r+Es.plinthClearanceMetres,a=Es.lengthMetres/2,o=t+Es.groundLiftMetres,s=o+Ds+Os/2;return{centre:new g(n,s,i),x0:n-a-Ds/2,x1:n+a+Ds/2,bottom:o,top:o+Os+2*Ds,z:i,zBack:i-.008,plinthGap:i-.008-r}}function As(e,t){let n=t.centre.clone().sub(e);if(e.z<=t.z+.05)return{length:0,height:0,factor:0,opacity:0};n.normalize();let r=Math.sqrt(Math.max(0,1-n.x*n.x)),i=Math.sqrt(Math.max(0,1-n.y*n.y)),a=Math.min(r,i),[o,s]=Es.fade,c=Math.min(1,Math.max(0,(a-o)/(s-o)));return{length:r,height:i,factor:a,opacity:c*c*(3-2*c)}}function js({placement:e,project:t,viewportHeight:n,viewportWidth:r,labelWidths:i}){let a=Math.min(r/1920,n/1080),o=Math.max(Es.labelCapMinPx,fa.capHeightPx1080*a),s=Math.max(Es.labelGapMinPx,fa.gapPx1080*a),{x0:c,x1:l,bottom:u,top:d,z:f,zBack:p}=e,m=[];for(let e of[c,l])for(let n of[u,d])for(let r of[f,p])m.push(t(new g(e,n,r)));let h=t(new g(c,u,f)),_=t(new g(l,u,f)),v=nt(m),y=(e,t)=>{let n=-1/0;return v.forEach((r,i)=>{let a=v[(i+1)%v.length];r.x>=e&&r.x<=t&&(n=Math.max(n,r.y));for(let i of[e,t])(r.x-i)*(a.x-i)<=0&&r.x!==a.x&&(n=Math.max(n,r.y+(a.y-r.y)*(i-r.x)/(a.x-r.x)))}),n};return{polygon:v,labels:[[`0`,h],[`5 m`,_]].map(([e,t],n)=>{let r=i[n],a=t.x-r/2,c=y(a,a+r),l={x:a,y:(Number.isFinite(c)?c:t.y)+s,width:r,height:o};for(let e=0;e<80&&at(tt(l),v)<s;e++)l.y+=.25;return{text:e,rect:l,cap:o}}),cap:o,gap:s,lengthPx:Math.hypot(_.x-h.x,_.y-h.y)}}function Ms(t,n){t.updateMatrixWorld(!0);let r=new U,i=null;if(t.traverse(e=>{let t=e.userData.sectionRole;t===`plinth`&&r.expandByObject(e),t===`ground`&&(i=e.getWorldPosition(new g).y),t===`scale`&&(e.visible=!1)}),r.isEmpty()||i===null)throw Error(`Scale bar needs the plinth and ground plane`);let a=ks({plinth:r,groundY:i}),o=new C;o.userData.sectionRole=`site-scale`,o.name=`site-scale-bar`;let s=[],c=e=>{let t=new ge({color:e,transparent:!0,opacity:1});return s.push(t),t},l=c(go.bone),u=c(go.grey),d=a.bottom+Ds+Os/2,f=a.centre.x,p=a.z,m=(t,n,r,i,a,s,c)=>{let l=new e(new se(t,n,r),c);l.position.set(i,a,s-r/2),l.castShadow=!1,l.receiveShadow=!1,o.add(l)};for(let e=0;e<5;e++)m(1,Os,.012,f-2+e,d,p-.002,e%2?u:l);for(let e=0;e<=5;e++)m(Ds,Os+2*Ds,.014,f-2.5+e,d,p-.001,l);for(let e of[-1,1])m(5+Ds,Ds,.015,f,d+e*(Os+Ds)/2,p,l);t.add(o);let h=[`0`,`5 m`].map(e=>{let t=document.createElement(`span`);return t.className=`scale-label`,t.textContent=e,t.setAttribute(`aria-hidden`,`true`),n.append(t),t}),_={visible:!1,opacity:0,labels:[],polygon:null},v=null,y=``;return{placement:a,group:o,update(e,t,n){let r=As(e.position,a);for(let e of s)e.opacity=r.opacity;o.visible=r.opacity>.001;let i=Math.min(t/1920,n/1080),c=Math.max(Es.labelCapMinPx,fa.capHeightPx1080*i),l=c/.66;if(y!==l.toFixed(2)){y=l.toFixed(2);for(let e of h)e.style.fontSize=`${l}px`,e.style.textShadow=`0 ${Math.max(1,i)}px ${fa.haloBlurPx1080*i}px ${fa.haloColor}`,e.hidden=!1;v=h.map(e=>e.getBoundingClientRect().width)}let u=js({placement:a,project:r=>{let i=r.clone().project(e);return{x:(i.x+1)*t/2,y:(1-i.y)*n/2}},viewportWidth:t,viewportHeight:n,labelWidths:v});return h.forEach((e,t)=>{let n=u.labels[t].rect;e.hidden=!o.visible,e.style.opacity=String(r.opacity),e.style.left=`${n.x}px`,e.style.top=`${n.y-.152*l}px`,e.style.lineHeight=`${l}px`}),_={visible:o.visible,opacity:r.opacity,visibility:r,polygon:o.visible?u.polygon:null,labels:o.visible?u.labels:[],lengthPx:u.lengthPx,cap:c,gap:u.gap,labelWidths:v,plinthGapMetres:a.plinthGap},_},metadata:()=>({..._,placement:{centre:a.centre.toArray(),x0:a.x0,x1:a.x1,bottom:a.bottom,top:a.top,z:a.z,plinthGapMetres:a.plinthGap}}),dispose(){t.remove(o),o.traverse(e=>e.geometry?.dispose()),s.forEach(e=>e.dispose()),h.forEach(e=>e.remove())}}}var Ns=e=>+e.toFixed(6);function Ps(e,t){return JSON.stringify({position:e.position.toArray().map(Ns),quaternion:e.quaternion.toArray().map(Ns),fov:Ns(e.fov),aspect:Ns(t.width/t.height),width:t.width,height:t.height,cell:t.cell})}function Fs(e,t){return!t?.rows||t.key!==e?null:{rows:t.rows.map(e=>e.map(e=>[...e])),cell:t.cell,width:t.width,height:t.height}}function Is(e,t,n){return{key:e,from:n,cell:t.cell,width:t.width,height:t.height,rows:t.rows}}function Ls(e,t){return e.cell!==t.cell||e.width!==t.width||e.height!==t.height||e.rows.length!==t.rows.length?!1:e.rows.every((e,n)=>e.length===t.rows[n].length&&e.every((e,r)=>e[0]===t.rows[n][r][0]&&e[1]===t.rows[n][r][1]))}function Rs({rows:e,cell:t}){let n=[];return e.forEach((e,r)=>{for(let[i,a]of e)for(let e of[r*t,(r+1)*t])n.push([i,e],[a,e])}),n}var zs=(e,t,n)=>e.map(([e,r])=>[n.centre.x+n.k*(e-t.centre.x),n.centre.y+n.k*(r-t.centre.y)]);function Bs(e,t){let n=zs(Rs(e.raster),e.reference,e.framing),r=zs(Rs(t.raster),t.reference,t.framing),i=(e,t)=>{let n=0;for(let[r,i]of e){let e=1/0;for(let[n,a]of t){let t=(r-n)**2+(i-a)**2;if(t<e&&(e=t,e===0))break}n=Math.max(n,e)}return Math.sqrt(n)};return Math.max(i(n,r),i(r,n))}var Vs=`STP1`,Hs=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,Us=Float32Array.from({length:256},(e,t)=>Hs(t/255)),Ws={f32:Float32Array,u32:Uint32Array,i32:Int32Array,u16:Uint16Array,i16:Int16Array,i8:Int8Array,u8:Uint8Array};function Gs(e,t){if(e.codec===`u16box`){let n=new Float32Array(t.length),[r,i]=e.box;for(let a=0;a<t.length;a++){let o=a%e.itemSize;n[a]=r[o]+t[a]/65535*(i[o]-r[o])}return new G(n,e.itemSize)}if(e.codec===`i8n`){let n=new Float32Array(t.length);for(let e=0;e<t.length;e++)n[e]=t[e]/127;return new G(n,e.itemSize)}if(e.codec===`srgb8`){let n=new Float32Array(t.length);for(let e=0;e<t.length;e++)n[e]=Us[t[e]];return new G(n,e.itemSize)}if(e.codec===`u16n`){let n=new Float32Array(t.length);for(let e=0;e<t.length;e++)n[e]=t[e]/65535;return new G(n,e.itemSize)}return new G(t,e.itemSize)}var Ks=()=>globalThis.performance?.now()??Date.now();function qs(e,t=null){let n=t?(e,n)=>{let r=Ks();return t[e]=(t[e]??0)+r-n,r}:(e,t)=>t,r=t?Ks():0,i=e instanceof Uint8Array?e:new Uint8Array(e);if(new TextDecoder().decode(i.subarray(0,4))!==Vs)throw Error(`site-tier pack: bad magic`);let a=new DataView(i.buffer,i.byteOffset).getUint32(4,!0),o=JSON.parse(new TextDecoder().decode(i.subarray(8,8+a))),s=Math.ceil((8+a)/4)*4,c=i.byteOffset+s,l=(e,t,n)=>{let r=Ws[e],a=c+t;return a%r.BYTES_PER_ELEMENT===0?new r(i.buffer,a,n):new r(i.slice(s+t,s+t+n*r.BYTES_PER_ELEMENT).buffer)};r=n(`header`,r);let u=new Map;for(let e of o.geometries){let t=new J;for(let[i,a]of Object.entries(e.attributes))t.setAttribute(i,Gs(a,l(a.type,a.offset,a.length))),r=n(`decode:${a.codec}`,r);e.index&&t.setIndex(new G(l(e.index.type,e.index.offset,e.index.length),1)),r=n(`decode:index`,r),t.computeBoundingBox(),t.computeBoundingSphere(),r=n(`bounds`,r),u.set(e.id,{geometry:t,record:e})}let d=Object.fromEntries(Object.entries(o.arrays).map(([e,t])=>[e,l(t.type,t.offset,t.length)]));return n(`arrays`,r),{meta:o.meta,geometries:u,arrays:d,header:o}}async function Js(e){let t=new Blob([e]).stream().pipeThrough(new DecompressionStream(`deflate-raw`));return new Uint8Array(await new Response(t).arrayBuffer())}function Ys(e,t){let n=[],r=t.nx*t.nz,i=0;for(let a=0;a<t.count;a++){let a=new Float32Array(r);for(let n=0;n<t.nz;n++){let r=0;for(let o=0;o<t.nx;o++)r=r+e[i++]&65535,a[n*t.nx+o]=t.lo+r*t.unitMetres}n.push(a)}return{xmin:t.xmin,zmin:t.zmin,width:t.width,length:t.length,stepMetres:t.stepMetres,nx:t.nx,nz:t.nz,grids:n}}var Xs=(e,t)=>(e*25+t*1e3)/1e3,Zs=255;function Qs(e,t){let n=ec(e,t),r;for(;!(r=n.next()).done;);return r.value}function*$s(e,t,n){let r=0;for(let i=0;i<e.length;i++)r=r+e[i]|0,t[i]=r,(i&1023)==1023&&n()&&(yield);return t}function*ec({lattice:e,blend:t,normal:n,index:r,heights:i,pairs:a,pairHeights:o},{vertices:s,index16:c,block:l,bottomY:u},d=()=>!1){let f=new Float32Array(3*s),p=new Float32Array(3*s),m=new Float32Array(3*s),h=new Float32Array(s),g=new Float32Array((yield*$s(i,new Int32Array(i.length),d)).buffer),_=new Map;for(let e=0;e<a.length;e+=5)_.set(a[e],e),e%5120==5115&&d()&&(yield);for(let n=0,r=0;n<s;n++){(n&1023)==1023&&d()&&(yield);let i=Xs(e[2*n],l.xmin),s=Xs(e[2*n+1],l.zmin),c=t[n],v=3*n;if(f[v]=i,f[v+2]=s,c===Zs){f[v+1]=u,p[v]=m[v]=i,p[v+1]=m[v+1]=s,h[n]=-1;continue}let y=g[r++];if(f[v+1]=y,c===0){p[v]=m[v]=i,p[v+1]=m[v+1]=s,p[v+2]=m[v+2]=y;continue}let b=_.get(n),x=b/5*2;h[n]=c/4,p[v]=Xs(a[b+1],l.xmin),p[v+1]=Xs(a[b+2],l.zmin),p[v+2]=o[x],m[v]=Xs(a[b+3],l.xmin),m[v+1]=Xs(a[b+4],l.zmin),m[v+2]=o[x+1]}let v=new Float32Array(n.length);for(let e=0;e<n.length;e++)v[e]=n[e]/127,(e&1023)==1023&&d()&&(yield);let y=yield*$s(r,c?new Uint16Array(r.length):new Uint32Array(r.length),d),b=new J;return b.setAttribute(`position`,new G(f,3)),b.setAttribute(`normal`,new G(v,3)),b.setAttribute(`eraSampleA`,new G(p,3)),b.setAttribute(`eraSampleB`,new G(m,3)),b.setAttribute(`eraBlend`,new G(h,1)),b.setIndex(new G(y,1)),b}var tc=()=>globalThis.performance?.now()??Date.now(),nc=`/purana-qila-in-layers/site-tier/`;async function rc({base:e=nc,fetch:t=globalThis.fetch.bind(globalThis),onTask:n=null}={}){let r=tc(),i=await t(e+`manifest.json`,{cache:`no-cache`});if(!i.ok)throw Error(`site-tier manifest: HTTP ${i.status}`);let a=await i.json();if(a.format!==`strata-site-tier`||a.version!==1)throw Error(`site-tier manifest: unknown format`);n?.({name:`site-tier-manifest`,durationMs:tc()-r});let o=new Map,s={};function c(r){if(o.has(r))return o.get(r);let i=a.packs[r];if(!i)throw Error(`site-tier: no pack ${r}`);let c=(async()=>{let a=tc(),o=await t(e+i.file);if(!o.ok)throw Error(`site-tier ${r}: HTTP ${o.status}`);let c=new Uint8Array(await o.arrayBuffer()),l=tc();if(c.byteLength!==i.bytes)throw Error(`site-tier ${r}: ${c.byteLength} bytes, manifest says ${i.bytes}`);let u=await Js(c),d=tc(),f=qs(u),p=tc();return s[r]={fetchMs:l-a,inflateMs:d-l,parseMs:p-d,bytes:i.bytes,inflatedBytes:u.byteLength},n?.({name:`site-tier-pack-${r}`,durationMs:p-a}),f})();return c.catch(()=>o.delete(r)),o.set(r,c),c}let l=(e,t)=>e.meta.geometryPack[t];return{manifest:a,timings:s,pack:c,base:e,fetch:t,evict(e){o.delete(e),delete s[e]},core:()=>c(`core`),async grids(){let e=await c(`grids`),t=e.header.arrays.grids;return Ys(e.arrays.grids,t.grid)},async step(e){let t=await c(`core`),n=new Set([`core`]);for(let r of t.meta.soilSteps[e]??[])n.add(l(t,r));for(let r of Object.values(t.meta.featureSteps[e]??{}))for(let e of r)e&&n.add(l(t,e));for(let r of Object.values(t.meta.fixedSoil??{}))(r.shown===`always`||e===0)&&n.add(r.pack);let r=await Promise.all([...n].map(c)),i=e=>{for(let t of r){let n=t.geometries.get(e);if(n)return n}throw Error(`site-tier: geometry ${e} missing`)};return{core:t,packs:[...n],geometry:i}},async fixedSoil(e){let t=(await c(`core`)).meta.fixedSoil[e],n=await c(t.pack),r=t=>n.arrays[`fixed:${e}:${t}`];return Qs({lattice:r(`lattice`),blend:r(`blend`),normal:r(`normal`),index:r(`index`),heights:r(`heights`),pairs:r(`pairs`),pairHeights:r(`pairHeights`)},t)}}}var ic=e=>Number(e).toFixed(6),ac=e=>new H(Ni(e)),oc=e=>`vec3(${ic(e.r)},${ic(e.g)},${ic(e.b)})`,sc=(([e,,t])=>[e/Math.hypot(e,t),0,t/Math.hypot(e,t)])(aa),cc=`vec2(dot(sitePosition,sitePlaneU.xyz)+sitePlaneU.w,dot(sitePosition,sitePlaneV.xyz)+sitePlaneV.w)`;function lc({mode:e,mapping:t,pages:n,grid:r,uniforms:i,bottomY:a,fadeStartY:o,displaced:s=!1,top:c={}}){let l=new q({color:16777215,roughness:1,metalness:0,flatShading:!0,side:e===`outer`||e===`inner`?2:0,shadowSide:e===`outer`?1:null,polygonOffset:e!==`inner`,polygonOffsetFactor:1,polygonOffsetUnits:1,...e===`floor`?{emissive:7361337,emissiveIntensity:.06}:{}}),u=t!==`uv`,d=e===`top`?{siteTop:{value:n.top}}:{siteAlbedo:{value:n.albedo},siteNormal:{value:n.normal}};u&&Object.assign(d,{sitePlaneU:{value:new x(...t.u)},sitePlaneV:{value:new x(...t.v)}}),l.userData.siteUniforms=d,l.onBeforeCompile=t=>{Object.assign(t.uniforms,i,d),t.vertexShader=`varying vec3 sitePosition; ${u?``:`varying vec2 siteUv;`}
      ${s&&e===`top`?`#define ERA_TOP_NORMAL`:``}
      ${s?Ya(r)+Qa+$a:``}
      ${t.vertexShader}`.replace(`#include <beginnormal_vertex>`,`#include <beginnormal_vertex>
      ${s?to:``}`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
      ${s?`transformed.y=eraY;`:``}
      sitePosition=(modelMatrix*vec4(transformed,1.0)).xyz; ${u?``:`siteUv=uv;`}`);let n=`varying vec3 sitePosition; ${u?`uniform vec4 sitePlaneU; uniform vec4 sitePlaneV;`:`varying vec2 siteUv;`}
      ${e===`top`?`uniform sampler2D siteTop; uniform int eraActive;
      const vec3 ERA_ALBEDO[11]=vec3[11](${Wa.map(e=>oc(ac(e.lab))).join(`,`)});
      const vec3 SEAL_ALBEDO=${oc(ac(Ga.lab))};
      ${Ya(r)}`:`uniform sampler2D siteAlbedo; uniform sampler2D siteNormal;`}`,l=u?cc:`siteUv`,f=e===`top`?`
        vec3 P=sitePosition; float eb[11]; eraBounds(P.xz,eb);
        vec3 flatN=normalize(cross(dFdx(P),dFdy(P))+vec3(0.0,1e-9,0.0));
        int e=eraActive, k=e+1;
        float veneer=e>=0?smoothstep(0.0,.06,P.y-eb[e]):1.0;
        vec3 under=e>=0?(e==2?SEAL_ALBEDO:ERA_ALBEDO[k-1]):ERA_ALBEDO[0];
        vec3 albedo=mix(under,e==1?SEAL_ALBEDO:ERA_ALBEDO[k],veneer)*${ic(c.albedoMultiplier)};
        vec4 sitePage=texture(siteTop,${l});
        diffuseColor.rgb=albedo*(sitePage.r*2.0);
        diffuseColor.rgb*=1.0-${ic(c.slopeDarken)}*smoothstep(.995,.8,abs(flatN.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,${oc(new H(2434338))},smoothstep(${ic(o)},${ic(a)},P.y));
        vec3 siteGradient=vec3(sitePage.g-.5,0.0,sitePage.b-.5)*${ic(2*c.gradientMax)};
        siteGradient*=1.0-smoothstep(${ic(o+.15)},${ic(o)},P.y);`:`
        diffuseColor.rgb=texture(siteAlbedo,${l}).rgb;
        vec3 siteWorldNormal=normalize(texture(siteNormal,${l}).xyz*2.0-1.0);`,p=e===`top`?`
        vec3 viewGradient=mat3(viewMatrix)*siteGradient;
        if(dot(viewGradient,viewGradient)<16.0) normal=normalize(normal-(viewGradient-normal*dot(viewGradient,normal)));`:`
        normal=normalize(mat3(viewMatrix)*siteWorldNormal);`;t.fragmentShader=`${n}
      ${t.fragmentShader}`.replace(`#include <color_fragment>`,`#include <color_fragment>${f}`).replace(`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>${p}`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
        ${e===`inner`?`{
          vec3 worldNormal=normalize((vec4(normal,0.0)*viewMatrix).xyz);
          totalEmissiveRadiance+=diffuseColor.rgb*${ic(oa)}*max(0.0,-dot(worldNormal,vec3(${sc.map(ic).join(`,`)})));
        }`:``}`)};let f=JSON.stringify({mode:e,planarMap:u,displaced:s,grid:[r.xmin,r.zmin,r.nx,r.nz,r.stepMetres],bottomY:a,fadeStartY:o,top:c});return l.customProgramCacheKey=()=>`site-soil-p2-${f}`,l}var uc=Object.freeze({top:0,outer:1,inner:2,floor:3}),dc=to.replace(`if(eraBlend>=0.0){`,`if(siteDisplaced==1&&eraBlend>=0.0){`).replace(`#ifdef ERA_TOP_NORMAL`,`if(siteTopNormal==1){`).replace(`#endif`,`}`);if(dc===`
    float eraY=position.y;
    if(eraBlend>=0.0){
      eraY=mix(eraTopAt(eraSampleA),eraTopAt(eraSampleB),eraBlend);
      #ifdef ERA_TOP_NORMAL
      vec2 exz=mix(eraSampleA.xy,eraSampleB.xy,eraBlend);
      float gx=eraTopGrid(exz+vec2(0.05,0.0))-eraTopGrid(exz-vec2(0.05,0.0)), gz=eraTopGrid(exz+vec2(0.0,0.05))-eraTopGrid(exz-vec2(0.0,0.05));
      objectNormal=normalize(vec3(-gx/0.1,1.0,-gz/0.1));
      #endif
    }`||/#ifdef|#endif/.test(dc))throw Error(`site soil: DISPLACE_Y changed shape`);function fc({mode:e,mapping:t,pages:n,grid:r,uniforms:i,bottomY:a,fadeStartY:o,displaced:s=!1,top:c={}}){if(!(e in uc))throw Error(`site soil: unknown mode ${e}`);let l=new q({color:16777215,roughness:1,metalness:0,flatShading:!0,side:e===`outer`||e===`inner`?2:0,shadowSide:e===`outer`?1:null,polygonOffset:e!==`inner`,polygonOffsetFactor:1,polygonOffsetUnits:1,...e===`floor`?{emissive:7361337,emissiveIntensity:.06}:{}}),u=t!==`uv`,d={siteMode:{value:uc[e]},siteMapping:{value:+!!u},siteDisplaced:{value:+!!s},siteTopNormal:{value:s&&e===`top`?1:0},sitePlaneU:{value:new x(...u?t.u:[0,0,0,0])},sitePlaneV:{value:new x(...u?t.v:[0,0,0,0])},siteTop:{value:n.top??null},siteAlbedo:{value:n.albedo??null},siteNormal:{value:n.normal??null}};l.userData.siteUniforms=d,l.onBeforeCompile=e=>{Object.assign(e.uniforms,i,d),e.vertexShader=`varying vec3 sitePosition; varying vec2 siteUv; uniform int siteDisplaced; uniform int siteTopNormal;
      ${Ya(r)+Qa+$a}
      ${e.vertexShader}`.replace(`#include <beginnormal_vertex>`,`#include <beginnormal_vertex>
      ${dc}`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
      transformed.y=eraY;
      sitePosition=(modelMatrix*vec4(transformed,1.0)).xyz; siteUv=uv;`);let t=`varying vec3 sitePosition; varying vec2 siteUv; uniform vec4 sitePlaneU; uniform vec4 sitePlaneV;
      uniform int siteMode; uniform int siteMapping;
      uniform sampler2D siteTop; uniform int eraActive;
      const vec3 ERA_ALBEDO[11]=vec3[11](${Wa.map(e=>oc(ac(e.lab))).join(`,`)});
      const vec3 SEAL_ALBEDO=${oc(ac(Ga.lab))};
      ${Ya(r)}
      uniform sampler2D siteAlbedo; uniform sampler2D siteNormal;`,n=`
        vec2 sitePageUv=siteMapping==1?${cc}:siteUv;
        vec3 siteGradient=vec3(0.0), siteWorldNormal=vec3(0.0,1.0,0.0);
        if(siteMode==0){
          vec3 P=sitePosition; float eb[11]; eraBounds(P.xz,eb);
          vec3 flatN=normalize(cross(dFdx(P),dFdy(P))+vec3(0.0,1e-9,0.0));
          int e=eraActive, k=e+1;
          float veneer=e>=0?smoothstep(0.0,.06,P.y-eb[e]):1.0;
          vec3 under=e>=0?(e==2?SEAL_ALBEDO:ERA_ALBEDO[k-1]):ERA_ALBEDO[0];
          vec3 albedo=mix(under,e==1?SEAL_ALBEDO:ERA_ALBEDO[k],veneer)*${ic(c.albedoMultiplier)};
          vec4 sitePage=texture(siteTop,sitePageUv);
          diffuseColor.rgb=albedo*(sitePage.r*2.0);
          diffuseColor.rgb*=1.0-${ic(c.slopeDarken)}*smoothstep(.995,.8,abs(flatN.y));
          diffuseColor.rgb=mix(diffuseColor.rgb,${oc(new H(2434338))},smoothstep(${ic(o)},${ic(a)},P.y));
          siteGradient=vec3(sitePage.g-.5,0.0,sitePage.b-.5)*${ic(2*c.gradientMax)};
          siteGradient*=1.0-smoothstep(${ic(o+.15)},${ic(o)},P.y);
        } else {
          diffuseColor.rgb=texture(siteAlbedo,sitePageUv).rgb;
          siteWorldNormal=normalize(texture(siteNormal,sitePageUv).xyz*2.0-1.0);
        }`;e.fragmentShader=`${t}
      ${e.fragmentShader}`.replace(`#include <color_fragment>`,`#include <color_fragment>${n}`).replace(`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>
        if(siteMode==0){
          vec3 viewGradient=mat3(viewMatrix)*siteGradient;
          if(dot(viewGradient,viewGradient)<16.0) normal=normalize(normal-(viewGradient-normal*dot(viewGradient,normal)));
        } else normal=normalize(mat3(viewMatrix)*siteWorldNormal);`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
        if(siteMode==2){
          vec3 worldNormal=normalize((vec4(normal,0.0)*viewMatrix).xyz);
          totalEmissiveRadiance+=diffuseColor.rgb*${ic(oa)}*max(0.0,-dot(worldNormal,vec3(${sc.map(ic).join(`,`)})));
        }`)};let f=JSON.stringify({grid:[r.xmin,r.zmin,r.nx,r.nz,r.stepMetres],bottomY:a,fadeStartY:o,top:c});return l.customProgramCacheKey=()=>`site-soil-p2u-${f}`,l}function pc(e,{srgb:t=!1,anisotropy:n=8,flipY:r=!0}={}){let i=new Ye(e);return i.flipY=r,i.colorSpace=t?pe:``,i.minFilter=f,i.magFilter=ie,i.generateMipmaps=!0,i.wrapS=i.wrapT=fe,i.anisotropy=n,i.needsUpdate=!0,i}function mc(e,t,n){let{width:r,height:i}=e,a=new OffscreenCanvas(r,i),o=a.getContext(`2d`,{willReadFrequently:!0}),[s,c,l]=[e,t,n].map(e=>(o.drawImage(e,0,0),o.getImageData(0,0,r,i).data)),u=o.createImageData(r,i);for(let e=0;e<u.data.length;e+=4)u.data[e]=s[e],u.data[e+1]=c[e],u.data[e+2]=l[e],u.data[e+3]=255;return o.putImageData(u,0,0),a}function hc(e){let t=e.attributes.position.array,n=e.index.array,r={"z+":[],"z-":[],"x+":[],"x-":[],other:[]},i=new g,a=new g,o=new g;for(let e=0;e<n.length;e+=3){i.fromArray(t,3*n[e]),a.fromArray(t,3*n[e+1]),o.fromArray(t,3*n[e+2]);let s=a.sub(i).cross(o.sub(i)),c=Math.abs(s.x),l=Math.abs(s.z),u=(t[3*n[e]]+t[3*n[e+1]]+t[3*n[e+2]])/3,d=(t[3*n[e]+2]+t[3*n[e+1]+2]+t[3*n[e+2]+2])/3;r[Math.abs(s.y)>Math.max(c,l)?`other`:l>=c?d>0?`z+`:`z-`:u>0?`x+`:`x-`].push(n[e],n[e+1],n[e+2])}return Object.fromEntries(Object.entries(r).filter(([,e])=>e.length).map(([t,n])=>{let r=new J;for(let[t,n]of Object.entries(e.attributes))r.setAttribute(t,n);return r.setIndex(n),[t,r]}))}var gc=e=>Math.max(0,Math.min(1,e)),_c=()=>globalThis.performance?.now()??Date.now(),vc=(e,t)=>e&&(e.getX(t)>.5&&e.getX(t)<1.5||e.getX(t)>2.5&&e.getY(t)>.5),yc=()=>new V(new Uint16Array([15360,15360,15360,15360]),1,1,Xe,E);function bc(e,t,n){let{width:r,height:i,box:a}=n,o=e.attributes.position,s=e.attributes.color,c=e.attributes.featureFinish;if(!s||!c)return null;let l=new Float32Array(r*i*3),u=new Float32Array(r*i).fill(-1/0),d=[0,0,0],p=0;for(let e=0;e<o.count;e++)vc(c,e)&&(d[0]+=s.getX(e),d[1]+=s.getY(e),d[2]+=s.getZ(e),p++);if(!p)return null;for(let e=0;e<3;e++)d[e]/=p;for(let e=0;e<r*i;e++)l.set(d,e*3);let m=e.index,h=m?.count??o.count,g=e=>m?m.getX(e):e;for(let e=0;e+2<h;e+=3){let t=[g(e),g(e+1),g(e+2)];if(!t.every(e=>vc(c,e)))continue;let n=t.map(e=>[(o.getX(e)-a[0])/a[2]*r-.5,(o.getZ(e)-a[1])/a[3]*i-.5]),[d,f,p]=n,m=(f[1]-p[1])*(d[0]-p[0])+(p[0]-f[0])*(d[1]-p[1]);if(Math.abs(m)<1e-10)continue;let h=Math.max(0,Math.ceil(Math.min(...n.map(e=>e[0])))),_=Math.min(r-1,Math.floor(Math.max(...n.map(e=>e[0])))),v=Math.max(0,Math.ceil(Math.min(...n.map(e=>e[1])))),y=Math.min(i-1,Math.floor(Math.max(...n.map(e=>e[1]))));for(let e=v;e<=y;e++)for(let n=h;n<=_;n++){let i=((f[1]-p[1])*(n-p[0])+(p[0]-f[0])*(e-p[1]))/m,a=((p[1]-d[1])*(n-p[0])+(d[0]-p[0])*(e-p[1]))/m,c=1-i-a;if(Math.min(i,a,c)<-1e-6)continue;let h=e*r+n,g=i*o.getY(t[0])+a*o.getY(t[1])+c*o.getY(t[2]);if(!(g<u[h])){u[h]=g;for(let e=0;e<3;e++)l[3*h+e]=i*s.array[t[0]*3+e]+a*s.array[t[1]*3+e]+c*s.array[t[2]*3+e]}}}let _=r+3,v=i+3,y=new Uint16Array(_*v*4).fill(15360);for(let e=0;e<i+2;e++)for(let n=0;n<r+2;n++){let a=Math.max(0,Math.min(i-1,e-1))*r+Math.max(0,Math.min(r-1,n-1)),o=(e*_+n)*4;for(let e=0;e<3;e++)y[o+e]=Je.toHalfFloat(1-t[4*a+3]/255+t[4*a+e]/255/Math.max(1e-6,l[3*a+e]))}let b=new V(y,_,v,Xe,E);return b.minFilter=f,b.magFilter=ie,b.generateMipmaps=!0,b.needsUpdate=!0,b}function xc(){let e=new J;for(let[t,n]of[[`position`,3],[`normal`,3],[`color`,3],[`uv`,2]])e.setAttribute(t,new T([],n));return e.setDrawRange(0,0),e}function Sc(e){let t=new Map,n=new WeakMap,r=new X,i=new X,a=new g,o=new g,s,c=!1,l=0,u=0,d=0,f=null,p=e=>!e&&globalThis.requestIdleCallback?new Promise(e=>globalThis.requestIdleCallback(e,{timeout:32})):Pa(),m=e=>{let t=e.index?.count??e.attributes.position.count,n=e.drawRange.start;return{start:n,count:Math.max(0,Math.min(t-n,e.drawRange.count))}};function h(e){let n=t.get(e);return n||(n={geometry:e,chunks:new Map,ranges:new Map,disposed:!1},n.release=()=>{n.disposed=!0;for(let e of n.chunks.values())l--,u-=e.bytes;n.chunks.clear(),n.ranges.clear(),t.delete(e),e.removeEventListener(`dispose`,n.release)},t.set(e,n),e.addEventListener(`dispose`,n.release),n)}async function _({signal:t,priority:n=!1,valid:r=()=>!0}={}){let i=()=>!c&&!t?.aborted&&r(),a=_c();if(!i())return null;s??=bt(()=>import(`./src-DVDxOBEf.js`),__vite__mapDeps([0,1]));let{MeshBVH:o}=await s;if(!i())return null;let g=[];for(let t of e)for(let e of t.handle.object.children){if(!e.visible||!e.material.visible||e.material.opacity===0)continue;let t=e.geometry,{start:n,count:r}=m(t);if(!r)continue;let i=h(t),a=`${n}:${r}`,o=i.ranges.get(a);o||i.ranges.set(a,o={ready:!1,trees:[]}),o.ready||g.push({record:i,entry:o,start:n,count:r})}await p(n);let _=_c(),v=0,y=0,b=0,x=()=>{let e=_c()-_;v=Math.max(v,e),y+=e,b++};for(let{record:e,entry:t,start:r,count:a}of g){if(e.disposed)continue;let s=[];for(let t=r;t<r+a;t+=12288){if(!i())return null;if(e.disposed)break;let c=Math.min(12288,r+a-t),f=`${t}:${c}`,m=e.chunks.get(f);if(!m){if(_c()-_>=8&&(x(),await p(n),_=_c(),!i()))return null;if(e.disposed)break;let r=e.geometry,a=new J,s=r.attributes.position,h=_c();r.boundingSphere===null&&r.computeBoundingSphere(),r.index?(a.setAttribute(`position`,s),a.setIndex(new G(r.index.array.subarray(t,t+c),1))):a.setAttribute(`position`,new G(s.array.subarray(t*s.itemSize,(t+c)*s.itemSize),s.itemSize,s.normalized));let g=new o(a,{indirect:!0}),v=o.serialize(g,{cloneBuffers:!1}),y=v.roots.reduce((e,t)=>e+t.byteLength,0)+(v.indirectBuffer?.byteLength??0)+(r.index?0:a.index.array.byteLength);d=Math.max(d,_c()-h),e.chunks.set(f,m={tree:g,bytes:y,bounds:g.getBoundingBox(new U)}),l++,u+=y}s.push(m)}e.disposed||(t.trees=s,t.ready=!0)}return x(),f={totalMs:_c()-a,workMs:y,maxChunkMs:v,chunks:b},f}function v(e,s){if(!e.layers.test(s.layers))return!1;let{start:c,count:l}=m(e.geometry),u=t.get(e.geometry)?.ranges.get(`${c}:${l}`);if(!u?.ready)return s.intersectObject(e,!1).length>0;let d=n.get(e);if(d&&d.geometryId===e.geometry.uuid&&d.world.equals(e.matrixWorld)||(d={geometryId:e.geometry.uuid,world:e.matrixWorld.clone(),inverse:e.matrixWorld.clone().invert(),sphere:e.geometry.boundingSphere.clone().applyMatrix4(e.matrixWorld)},n.set(e,d)),i.copy(s.ray).recast(s.near),!d.sphere.containsPoint(i.origin)&&(!i.intersectSphere(d.sphere,o)||i.origin.distanceToSquared(o)>(s.far-s.near)**2)||(r.copy(s.ray).applyMatrix4(d.inverse),e.geometry.boundingBox&&!r.intersectsBox(e.geometry.boundingBox)))return!1;let f=e.matrixWorld.elements,p=r.direction,h=Math.hypot(f[0]*p.x+f[4]*p.y+f[8]*p.z,f[1]*p.x+f[5]*p.y+f[9]*p.z,f[2]*p.x+f[6]*p.y+f[10]*p.z),g=s.far/h,_=(g+1e-7*Math.max(1,g))**2,v=e.material.side,y={intersectsBounds(e){return e.containsPoint(r.origin)||!!(r.intersectBox(e,o)&&o.distanceToSquared(r.origin)<=_)},intersectsTriangle(t){if(!(v===1?r.intersectTriangle(t.c,t.b,t.a,!0,a):r.intersectTriangle(t.a,t.b,t.c,v!==2,a)))return!1;let n=a.applyMatrix4(e.matrixWorld).distanceTo(s.ray.origin);return n>=s.near&&n<=s.far}};for(let e of u.trees)if(y.intersectsBounds(e.bounds)&&e.tree.shapecast(y))return!0;return!1}return{prepare:_,meshOccludes:v,status:()=>({trees:l,bytes:u,maxBuildMs:d,preparation:f}),dispose(){c=!0;for(let e of t.values())e.release()}}}function Cc({core:t,geometry:n,stack:r,anchorTable:i}={}){if(!t?.meta?.featureDriver)throw Error(`site-tier: core featureDriver is required`);if(typeof n!=`function`)throw TypeError(`site-tier: resident geometry resolver is required`);let a=new C;a.name=`era-features`,a.userData.sectionRole=`feature`;let o=[],s=[],c=[],l=yc(),u={textures:0,bytes:0,loadCpuMs:0};l.needsUpdate=!0;let d=!1;function f(r,i,a=null){let o=new C;o.name=a?i:r.kitId,o.matrixAutoUpdate=!1;let s=a?[a]:r.slots,f={},p=new U,m={triangles:0,drawCalls:0,lastCutCacheHit:!0},h=s.map(t=>{let n=new q({color:t.colour??16777215,vertexColors:!0,map:l,roughness:t.roughness??1,metalness:0,side:a?2:0}),r=new e(xc(),n);return r.name=a?`ring-${a.key}`:``,r.castShadow=t.castShadow,r.receiveShadow=t.receiveShadow,r.frustumCulled=!1,r.userData.sectionRole=`feature`,a&&(r.userData.group=`ring-${a.key}`),o.add(r),r}),g=s.map(()=>new Map),_=null,v=1,y=s.map(()=>[0]),b=[],x={object:o,courseCount:a?1:r.courseCount,anchors:f,bounds:p,stats:m,setCuts:T,setReveal:w,warmCuts:()=>0,dispose:E,release(e){let t=0;return g.forEach(n=>{for(let r of e){let e=n.get(r);e&&(e.geometry.dispose(),e.texture?.dispose(),n.delete(r),t++)}}),t},uses:e=>b.some(t=>t&&e.has(t))};c.push(x);function S(){let e=v===0?0:Math.min(x.courseCount,Math.ceil(v*x.courseCount));if(m.triangles=0,m.drawCalls=0,h.forEach((t,n)=>{let r=a?e?t.geometry.index?.count??t.geometry.attributes.position.count:0:y[n][e];a||t.geometry.setDrawRange(0,r),t.visible=r>0,t.visible&&(m.triangles+=r/3,m.drawCalls++)}),!a&&_!==null){let t=r.kitAnchors[_][e];for(let e of Object.keys(f))delete f[e];f[r.kitId]=t.anchor}}function w(e){if(!Number.isFinite(e))throw Error(`Feature reveal must be finite`);v=gc(e),S()}function T(e,o=t.meta.defaultStep){if(d)throw Error(`Disposed feature`);if(_===o||a&&_!==null)return;let c=a?[a.id]:t.meta.featureSteps[o]?.[i];if(!c)throw Error(`site-tier: no feature step ${o} for ${i}`);let f=c.map((e,t)=>g[t].has(e)?null:e?n(e):null).map((e,n)=>{let r=g[n].get(c[n]);if(r)return r;let i=e?new J:xc();if(e){for(let[t,n]of Object.entries(e.geometry.attributes))i.setAttribute(t,n);i.setIndex(e.geometry.index),i.boundingBox=e.geometry.boundingBox?.clone()??null,i.boundingSphere=e.geometry.boundingSphere?.clone()??null}let a=i.attributes.position;i.attributes.color||i.setAttribute(`color`,new M(new Uint8Array(a.count*3).fill(255),3,!0));let o=s[n],l=o.paint&&t.arrays[o.paint],d=o.paint&&t.header.arrays[o.paint],f=_c(),p=l&&e?bc(e.geometry,l,d):null;_===null&&p&&(u.textures++,u.bytes+=p.image.data.byteLength,u.loadCpuMs+=_c()-f);let m=p?new Float32Array(a.count*2):null,h=i.attributes.featureFinish;for(let e=0;p&&e<a.count;e++){let t=p&&vc(h,e);m[2*e]=t?(gc((a.getX(e)-d.box[0])/d.box[2])*d.width+1)/(d.width+3):p?(d.width+2.5)/(d.width+3):.5,m[2*e+1]=t?(gc((a.getZ(e)-d.box[1])/d.box[3])*d.height+1)/(d.height+3):p?(d.height+2.5)/(d.height+3):.5}m?i.setAttribute(`uv`,new G(m,2)):i.attributes.uv||i.setAttribute(`uv`,new M(new Uint8Array(a.count*2),2,!0));let v={geometry:i,texture:p,ends:e?.record.ends??Array(x.courseCount+1).fill(0)};return g[n].set(c[n],v),v});p.makeEmpty(),f.forEach((e,t)=>{_===null&&h[t].geometry.dispose(),h[t].geometry=e.geometry,h[t].material.map=e.texture??l,e.geometry.boundingBox&&p.union(e.geometry.boundingBox)}),y=f.map(e=>e.ends),b=c,_=o,a||(x.courseCount=r.kitAnchors[o][0].courseCount),S()}function E(){for(let e of g){for(let t of e.values())t.geometry.dispose(),t.texture?.dispose();e.clear()}for(let e of h)e.material.dispose();y=[],b=[]}return T(null,t.meta.defaultStep),x}for(let[e,n]of Object.entries(t.meta.featureItems)){let t=new O().fromArray(n.matrix),r=f(n,e);r.object.matrix.copy(t),r.object.updateMatrixWorld(!0),a.add(r.object),o.push({key:e,featureId:n.featureId,part:n.part,kitId:n.kitId,era:n.era,rule:n.rule,dug:n.dug,dugMin:n.dugMin,buried:n.buried,bbox:new U(new g(...n.bbox.min),new g(...n.bbox.max)),findCandidates:n.findCandidates??void 0,matrix:t,normalMatrix:new z().getNormalMatrix(t),handle:r,step:null,specs:new Map,rules:[],keep:[]})}for(let e of t.meta.ring){let n=`mauryan-ring-well:${e.key}`,r=f({},n,e),i=r.bounds.clone();i.min.y-=t.meta.ringWell.sinkMetres,a.add(r.object),r.object.updateMatrixWorld(!0);let c={key:n,featureId:`mauryan-ring-well`,part:e.key,kitId:null,era:1,rule:`opening`,dug:!0,dugMin:0,buried:0,ring:!0,matrix:new O,normalMatrix:new z,bbox:i,handle:r,step:null,specs:new Map,rules:[],keep:[]};o.push(c),s.push(c)}let p=Sc(o),m=Ra({group:a,items:o,ring:{items:s,sinkMetres:t.meta.ringWell.sinkMetres},stack:r,driverData:t.meta.featureDriver,anchorTable:i,meshOccludes:p.meshOccludes,cacheCandidates:!0,prepareAnchors:p.prepare}),h=m.anchorStatus;m.anchorStatus=()=>({...h(),...p.status()});let _=m.dispose;return m.release=e=>{let t=new Set(e);if(c.some(e=>e.uses(t)))throw Error(`site-tier: cannot release displayed feature geometry`);return c.reduce((e,n)=>e+n.release(t),0)},m.dispose=()=>{d||=(p.dispose(),_(),l.dispose(),!0)},{group:a,site:m,paintStats:u}}var $=()=>globalThis.performance?.now()??Date.now(),wc=[`lattice`,`blend`,`normal`,`index`,`heights`,`pairs`,`pairHeights`],Tc={top:e=>`era-top-step-${e}`,"walls-core":e=>`era-walls-step-${e}`,walls:e=>`era-walls-step-${e}`,floors:e=>`era-floors-step-${e}`,front:e=>`era-front-step-${e}`},Ec=2,Dc=2,Oc=600,kc=1024,Ac=8,jc=e=>{let t;for(;!(t=e.next()).done;);return t.value},Mc=()=>!1;function*Nc(e,t=Mc){let n=e.attributes.position,r=e.index;if(!r||n.isInterleavedBufferAttribute||n.normalized||n.itemSize!==3||e.attributes.normal){e.computeVertexNormals();return}let i=n.array,a=r.array,o=new Float32Array(n.count*3);for(let e=0,n=r.count;e<n;e+=3){let n=3*a[e],r=3*a[e+1],s=3*a[e+2],c=i[r],l=i[r+1],u=i[r+2],d=i[s]-c,f=i[s+1]-l,p=i[s+2]-u,m=i[n]-c,h=i[n+1]-l,g=i[n+2]-u,_=f*g-p*h,v=p*m-d*g,y=d*h-f*m,b=o[n]+_,x=o[n+1]+v,S=o[n+2]+y,C=o[r]+_,w=o[r+1]+v,T=o[r+2]+y,E=o[s]+_,D=o[s+1]+v,O=o[s+2]+y;o[n]=b,o[n+1]=x,o[n+2]=S,o[r]=C,o[r+1]=w,o[r+2]=T,o[s]=E,o[s+1]=D,o[s+2]=O,e%3072==3069&&t()&&(yield)}for(let e=0;e<o.length;e+=3){let n=o[e],r=o[e+1],i=o[e+2],a=1/(Math.sqrt(n*n+r*r+i*i)||1);o[e]=n*a,o[e+1]=r*a,o[e+2]=i*a,e%3072==3069&&t()&&(yield)}e.setAttribute(`normal`,new G(o,3))}function Pc(e,t){let n=Error(`site-tier: cut step ${e} is not resident (${t.join(`, `)||`pages`})`);return n.name=`SiteStateNotResident`,n.packs=t,n}function Fc(e,{antialias:t=!0,preserve:n=!1,background:r=`css`,pixelRatio:i=globalThis.devicePixelRatio||1}={}){return new Mi({canvas:e,antialias:t&&i<Dc,alpha:r===`css`,preserveDrawingBuffer:n,powerPreference:`high-performance`})}async function Ic(t,{width:n=1920,height:r=1080,antialias:i=!0,preserve:a=!1,view:o=`turntable`,soil:s=`eras`,angle:c=0,assets:l={},anchorTable:u=Da,maxResidentSteps:f=1/0,prefetch:p=!0,onProgress:m=()=>{},programs:h=`merged`,background:_=`css`,renderer:v=null,warmUploads:y=!0,pixelRatio:b=globalThis.devicePixelRatio||1,maxPixelRatio:x=Ec,phone:S=null}={}){if(![`merged`,`split`].includes(h))throw Error(`site-tier world: programs ${h}`);if(![`css`,`texture`].includes(_))throw Error(`site-tier world: background ${_}`);if(s!==`eras`)throw Error(`site-tier world: soil must be eras`);if(o!==`turntable`)throw Error(`site-tier world: view ${o} is not supported`);let w=$(),T={};m({phase:`scene`});let D=$(),O=await rc(l),{manifest:ee}=O,k=new Map,A=new Set,ne=new Map;function re(e){return k.has(e)?Promise.resolve(k.get(e)):(A.add(e),O.pack(e).then(t=>(A.delete(e),ne.delete(e),k.set(e,t),t),t=>{throw A.delete(e),ne.set(e,String(t?.message??t)),t.pack??=e,t}))}let j=ee.pages??{},N=new Map,P=new Map,ie=async(e,t)=>{let n=await O.fetch(O.base+e);if(!n.ok)throw Error(`site-tier page ${e}: HTTP ${n.status}`);return createImageBitmap(await n.blob(),{imageOrientation:t?`flipY`:`none`,premultiplyAlpha:`none`,colorSpaceConversion:`none`})};function F(e){if(N.has(e))return Promise.resolve(N.get(e));if(P.has(e))return P.get(e);let t=j[e];if(!t)return Promise.reject(Object.assign(Error(`site-tier: no page ${e} in the manifest`),{pack:`page:${e}`}));let n=(async()=>{let n;if(t.kind===`top`){let[e,r,i]=await Promise.all([`variation`,`gradX`,`gradZ`].map(e=>ie(t.maps[e].file,!1)));n={top:pc(mc(e,r,i))};for(let t of[e,r,i])t.close()}else{let[e,r]=await Promise.all([`albedo`,`normal`].map(e=>ie(t.maps[e].file,!0)));n={albedo:pc(e,{srgb:!0,flipY:!1}),normal:pc(r,{flipY:!1})}}return N.set(e,n),n})();return P.set(e,n),n.then(()=>P.delete(e),()=>P.delete(e)),n.catch(t=>{throw ne.set(`page:${e}`,String(t?.message??t)),t.pack??=`page:${e}`,t})}let I=ee.firstViewPages??[],L=Promise.all([re(`core`),re(`grids`),...I.map(F)]);L.catch(()=>{});let ae=$();if(v&&v.domElement!==t)throw Error(`site-tier world: the injected renderer must draw to the given canvas`);if(v&&v.getContext().getContextAttributes().alpha!==(_===`css`))throw Error(`site-tier world: the injected renderer was created for another background`);let R=v??Fc(t,{antialias:i,preserve:a,background:_,pixelRatio:b});R.setPixelRatio(1);let z=(e,n)=>{let r=t.clientWidth,i=t.clientHeight;return!(r>0&&i>0)||e<=r*x+1&&n<=i*x+1?[e,n,!1]:[Math.round(r*x),Math.round(i*x),!0]},B=R.setSize.bind(R),oe=new d;R.setSize=(e,t,n)=>{let[r,i,a]=z(e,t);a&&R.getSize(oe).x===r&&oe.y===i||B(r,i,n)},R.setSize(n,r,!1),R.outputColorSpace=pe,R.toneMapping=4,R.toneMappingExposure=1.2,R.shadowMap.enabled=!0,R.shadowMap.type=3,R.info.autoReset=!1;let se=new Re;_===`texture`?se.background=vo(n,r):R.setClearColor(0,0);let ce=new Ue(25,n/r,.1,180),le=new g(-1.4,-3.85,0),ue=27*Math.PI/180,de=35*Math.PI/180+c*Math.PI/180+mo(0);ce.position.set(le.x+74*Math.cos(ue)*Math.sin(de),le.y+74*Math.sin(ue),le.z+74*Math.cos(ue)*Math.cos(de)),ce.lookAt(le),ce.updateMatrixWorld();let{key:fe}=yo(se),me=S??Math.min(globalThis.innerWidth??1/0,globalThis.innerHeight??1/0)<=Oc;me&&(fe.shadow.radius*=kc/fe.shadow.mapSize.x,fe.shadow.mapSize.set(kc,kc)),fe.shadow.mapPass=new $e(fe.shadow.mapSize.x,fe.shadow.mapSize.y,{format:te,type:E,depthBuffer:!1}),T.stageMs=$()-ae;let[he]=await L,ge=await O.grids();T.firstViewMs=$()-D,D=$();let H=he.meta,_e=H.levels,ve=ro(ge),ye={eraB0:{value:ve[0]},eraB1:{value:ve[1]},eraB2:{value:ve[2]},eraDeposits:{value:Array(10).fill(1)},eraActive:{value:9}},be=no({grid:ge,uniforms:ye}),xe={albedoMultiplier:fo,slopeDarken:po,gradientMax:j.top?.gradientMax},Se={grid:ge,uniforms:ye,bottomY:_e.bottomY,fadeStartY:_e.fadeStartY,top:xe},U=new Map;function Ce(e,t,n=!1){let r=`${e}|${t}|${n}`;if(U.has(r))return U.get(r);let i=t===`top-xz`?`top`:t,a=N.get(i);if(!a)throw Error(`site-tier: page ${i} not loaded`);let o=j[i].kind===`atlas`?`uv`:j[i].plane,s=(h===`merged`?fc:lc)({...Se,mode:e,mapping:o,displaced:n,pages:a});return s.userData.sitePage=i,U.set(r,s),s}let we=new C;we.name=`era-soil-block`,se.add(we);function Te(t,n,r,i,a=null,o=!0){let s=new e(t,n);return s.visible=o,s.castShadow=!0,s.receiveShadow=!0,s.userData.sectionRole=r,s.userData.group=i,s.userData.eraSoil=!0,s.name=i,a&&(s.customDepthMaterial=be,s.frustumCulled=!1,s.userData.eraDisplaced=a),we.add(s),s}let Ee=(e,t,n)=>ec(Object.fromEntries(wc.map(n=>[n,e.arrays[`fixed:${t}:${n}`]])),H.fixedSoil[t],n),De=0;function*Oe(e,t,n,r,i,a){let o=[Te(yield*Ee(e,t,i),Ce(`top`,`top-xz`,!0),`top`,`era-top${r}`,`top`,a)];for(let[t,s]of Object.entries(hc(yield*Ee(e,n,i))))t===`other`?De+=s.index.count/3:o.push(Te(s,Ce(`outer`,t,!0),`cutface`,`era-outer${r}-${t}`,`face`,a));return o}let ke=jc(Oe(he,`top`,`faces`,``,Mc,!0)),Ae=he.geometries.get(`soil:pedestal`).geometry;Ae.attributes.normal||Ae.computeVertexNormals(),ke.push(Te(Ae,Ce(`inner`,`core`),`cutface`,`era-ring-pedestal`));let je=H.defaultStep,Me=H.cutSteps,W=new Map,Ne=new Map,Pe=e=>H.geometryPack[e];function Fe(e){let t=new Set([`core`]);for(let n of H.soilSteps[e]??[])t.add(Pe(n));for(let n of Object.values(H.featureSteps[e]??{}))for(let e of n)e&&t.add(Pe(e));for(let n of Object.values(H.fixedSoil))(n.shown===`always`||e===0)&&t.add(n.pack);return[...t]}let G=e=>e>0&&e<je&&j[`step-${e}`]?[`step-${e}`]:[],Ie=e=>Fe(e).filter(e=>!k.has(e)),K=e=>W.has(e)&&Ie(e).length===0;function Le(e){let t=Pe(e),n=k.get(t);if(!n)throw Pc(We?.k??je,[t]);let r=n.geometries.get(e);if(!r)throw Error(`site-tier: geometry ${e} missing from pack ${t}`);return r}function*ze(e,t){let n=[];for(let r of H.soilSteps[e]??[]){let{geometry:i,record:a}=Le(r),o=r.split(`:`)[2];i.attributes.normal||(yield*Nc(i,t)),n.push(Te(i,Ce(a.mode,a.texture),a.role,Tc[o](e),null,!1)),t()&&(yield)}if(e===0){let e=H.fixedSoil.marginTop;n.push(...yield*Oe(k.get(e.pack),`marginTop`,`marginFaces`,`-margins`,t,!1))}for(let t of n)t.visible=We?.k===e;W.set(e,{k:e,meshes:n})}let Be=new Set,J=[],Y=new Map,X=e=>globalThis.scheduler?.postTask?globalThis.scheduler.postTask(e,{priority:`user-visible`}):setTimeout(e,0);function Ve(e){return new Promise((t,n)=>{let r=0,i=()=>$()>r,a=ze(e,i),o={k:e,atMs:+$().toFixed(1),ms:0,slices:0,maxSliceMs:0},s=0,c=!1,l=()=>{let t=++s,n=e=>{t===s&&u(e)};c=!Be.has(e),c?Ct(n,{timeout:1e3}):X(n)};Y.set(e,()=>{c&&l()});function u(s){if(c=!1,St){n(Error(`site-tier world: disposed`));return}let u=$();r=u+(!s||s.didTimeout||Be.has(e)?Ac:Math.min(Ac,s.timeRemaining()));let d;try{do d=a.next();while(!d.done&&!i())}catch(t){Y.delete(e),n(t);return}let f=$()-u;o.ms+=f,o.slices++,o.maxSliceMs=Math.max(o.maxSliceMs,f),J.length<1e3&&J.push({k:e,atMs:+u.toFixed(1),ms:+f.toFixed(1),urgent:Be.has(e)}),d.done?(Y.delete(e),Ke.push({...o,ms:+o.ms.toFixed(1),maxSliceMs:+o.maxSliceMs.toFixed(1),wallMs:+($()-o.atMs).toFixed(1)}),t()):l()}l()})}function He(e,{background:t=!1}={}){if(K(e))return Promise.resolve();if(!t&&!Be.has(e)&&(Be.add(e),Y.get(e)?.()),Ne.has(e))return Ne.get(e);let n=Promise.all([...Fe(e).map(re),...G(e).map(F)]).then(()=>W.has(e)?null:Ve(e).then(()=>Q(e))).then(()=>qe(e));Ne.set(e,n);let r=()=>{Ne.delete(e),Be.delete(e)};return n.then(r,r),n}let We=null,Ge=null,Ke=[];function qe(e=null){let t=()=>[...W.keys()].filter(e=>e!==je);for(;t().length>f;){let n=new Set([je,We?.k,Ge,e,...Ne.keys()].filter(e=>e!=null)),r=new Set([...n].flatMap(Fe)),i=t().filter(e=>!n.has(e)).sort((e,t)=>Math.abs(t-(We?.k??je))-Math.abs(e-(We?.k??je)))[0];if(i===void 0)break;let a=W.get(i);for(let e of a.meshes)e.removeFromParent(),i===0&&e.userData.eraDisplaced&&e.geometry.dispose();W.delete(i),gt.delete(i);for(let e of Fe(i)){if(r.has(e)||e===`core`||e===`grids`||[...W.keys()].some(t=>Fe(t).includes(e)))continue;let t=k.get(e);if(!t)continue;let n=[...t.geometries.keys()];Ye.release(n);for(let e of n)mt.delete(e);for(let{geometry:e}of t.geometries.values())e.dispose();k.delete(e),O.evict(e)}for(let e of G(i)){let t=N.get(e);if(t){for(let[t,n]of U)n.userData.sitePage===e&&(n.dispose(),U.delete(t));for(let e of Object.values(t))e.dispose();N.delete(e)}}}}jc(ze(je,Mc)),T.soilMs=$()-D,D=$();let{group:Je,site:Ye,paintStats:Ze}=Cc({core:he,geometry:Le,stack:ge,anchorTable:u});Je.userData.sectionRole=`feature`,se.add(Je),T.featuresMs=$()-D;let Qe=(t,n,{cast:r=!0,receive:i=!0,role:a=`feature`,group:o=a}={})=>{let s=new e(t,n);return s.castShadow=r,s.receiveShadow=i,s.userData.sectionRole=a,s.userData.group=o,se.add(s),s},et=new V(new Uint16Array([15360,15360,15360,15360]),1,1,Xe,E);et.needsUpdate=!0,bo({scene:se,add:h===`split`?Qe:(e,t,n)=>(e.setAttribute(`color`,new M(new Uint8Array(e.attributes.position.count*3).fill(255),3,!0)),Qe(e,t,n)),material:h===`split`?e=>new q({color:e,roughness:1,metalness:0}):e=>new q({color:e,vertexColors:!0,map:et,roughness:1,metalness:0}),base:H.base,plinthColour:Li.photo.plinth,scaleBar:!1});let tt=lo({stack:ge});T.plinthMs=$()-D-T.featuresMs,T.totalMs=$()-w;function nt(e,t){let n=ka(e.excavation);if(!K(n))throw Pc(n,Ie(n));let r=$(),i=t===void 0?Ye.applyState(e):Ye.applyState(e,t),a=$(),o=ga(e.deposits);ye.eraDeposits.value=o,ye.eraActive.value=ya(o);for(let e of W.values())for(let t of e.meshes)t.visible=e.k===n;return We={k:n},tt.beginFrame(e),{...i,cutStep:n,cutAssumesFullDeposits:n>0&&o.some(e=>e<1),timings:{featuresMs:a-r,blockMs:$()-a}}}function rt(e){let t=ka(e.excavation);if(!K(t))throw Pc(t,Ie(t));let n=$(),r=Ye.warmState(e);return Ge=t,{featuresMs:r,totalMs:$()-n}}let it=e=>K(ka(e.excavation)),at=e=>He(ka(e.excavation)),ot=!1,st=!1,ct={completed:0,total:0,error:null,finished:!1};async function lt(){let e=()=>Array.from({length:Me+1},(e,t)=>t).filter(e=>!K(e)).sort((e,t)=>Math.abs(e-(We?.k??je))-Math.abs(t-(We?.k??je))||e-t);ct.total=e().length;for(let t=e();t.length&&!st&&!([...W.keys()].filter(e=>e!==je).length>=f);t=e()){try{await He(t[0],{background:!0}),ct.completed++}catch(e){ct.error=String(e?.message??e);break}await new Promise(e=>(globalThis.requestIdleCallback??(e=>setTimeout(e,0)))(e,{timeout:1e3}))}ct.finished=!0}function ut(){ot||(ot=!0,lt())}let dt=new $e(1,1,{depthBuffer:!1});dt.texture.colorSpace=R.outputColorSpace,dt.isXRRenderTarget=!0;let ft=new Ue,pt=null;Je.traverse(e=>{!pt&&e.isMesh&&e.material.side===0&&(pt=e.material)});let mt=new Set(Object.values(H.featureSteps[je]??{}).flat().filter(Boolean)),ht=[],gt=new Set([je]),_t={enabled:y,slots:0,maxSlotMs:0,totalMs:0,tasks:0,maxTaskMs:0,bytes:0,draws:0,steps:[],log:[]},vt=!1,yt=!1,bt=null,xt=1e-6,St=!1,Ct=(e,t)=>(globalThis.requestIdleCallback??(e=>setTimeout(()=>e({didTimeout:!0,timeRemaining:()=>8}),0)))(e,t),Z=e=>[...Object.values(e.attributes),e.index].reduce((e,t)=>e+(t?(t.isInterleavedBufferAttribute?t.data.array:t.array).byteLength:0),0);function Q(e){!y||gt.has(e)||ht.includes(e)||(ht.push(e),wt())}function wt(){!vt||yt||St||!bt&&!ht.length||(yt=!0,Ct(Dt,{timeout:1e3}))}function Tt(e){let t=[];for(let n of G(e))for(let e of Object.values(N.get(n)??{}))t.push({texture:e,bytes:e.image.width*e.image.height*4});for(let n of W.get(e).meshes)t.push({geometry:n.geometry,material:n.material,receive:n.receiveShadow,bytes:Z(n.geometry)});if(pt)for(let n of Object.values(H.featureSteps[e]??{}))for(let e of n){if(!e||mt.has(e))continue;mt.add(e);let n=Le(e).geometry;t.push({geometry:n,material:pt,receive:!0,bytes:Z(n)})}return t}function Et(t){let n=R.getRenderTarget(),r=R.shadowMap,{autoUpdate:i,needsUpdate:a}=r,o={...R.info.render},s=t.map(t=>{let n=new e(t.geometry,t.material);return n.frustumCulled=!1,n.receiveShadow=t.receive,n.layers.set(31),se.add(n),n});se.traverse(e=>{e.isLight&&e.layers.test(ce.layers)&&e.layers.enable(31)}),ft.copy(ce),ft.layers.set(31),r.autoUpdate=!1,r.needsUpdate=!1;try{R.setRenderTarget(dt),R.render(se,ft)}finally{R.setRenderTarget(n),r.autoUpdate=i,r.needsUpdate=a;for(let e of s)e.removeFromParent();Object.assign(R.info.render,o)}_t.draws++}function Dt(e){if(yt=!1,St)return;let t=$(),n=e.didTimeout?8:Math.min(8,e.timeRemaining()),r=[],i=0,a=0,o=e=>1+e*xt,s=()=>{if(!r.length)return;let e=$();Et(r);let t=$()-e;i>=1<<20&&(xt=Math.max(xt,t/i)),_t.maxTaskMs=Math.max(_t.maxTaskMs,t),r=[],i=0};for(;;){if(!bt){let e=ht.shift();if(e===void 0)break;if(!W.has(e))continue;bt={k:e,tasks:Tt(e),started:$(),ms:0}}if(!W.has(bt.k)){bt=null;continue}let c=bt.tasks[0];if(!c){let e=$();s(),bt.ms+=$()-e,gt.add(bt.k),_t.steps.push({k:bt.k,ms:+bt.ms.toFixed(1)}),bt=null;continue}let l=c.texture?c.bytes*xt:o(i+c.bytes)-(r.length?o(i):0);if((a||r.length||!e.didTimeout&&n<7)&&$()-t+(r.length?o(i):0)+l>n)break;bt.tasks.shift(),a++,_t.tasks++,_t.bytes+=c.bytes;let u=$();if(c.texture){R.initTexture(c.texture);let e=$()-u;_t.maxTaskMs=Math.max(_t.maxTaskMs,e),c.bytes>=1<<20&&(xt=Math.max(xt,e/c.bytes))}else r.push(c),i+=c.bytes;bt.ms+=$()-u}{let e=$();s(),bt&&(bt.ms+=$()-e)}let c=$()-t;a?(_t.slots++,_t.totalMs+=c,_t.maxSlotMs=Math.max(_t.maxSlotMs,c),_t.log.length<500&&_t.log.push({atMs:+t.toFixed(1),ms:+c.toFixed(1),budgetMs:+n.toFixed(1),timedOut:e.didTimeout}),wt()):setTimeout(wt,100)}se.onAfterRender=(e,t,n)=>{n===ft||vt||(vt=!0,p&&Ct(ut,{timeout:2e3}),wt())};function Ot(){return{calls:R.info.render.calls,triangles:R.info.render.triangles,geometries:R.info.memory.geometries,textures:R.info.memory.textures,programs:R.info.programs.length}}function kt(){let e=R.getContext(),t=e.getExtension(`WEBGL_debug_renderer_info`);return{renderer:t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):e.getParameter(e.RENDERER),samples:e.getParameter(e.SAMPLES),width:n,height:r,drawingBuffer:[e.drawingBufferWidth,e.drawingBufferHeight],programs:h,background:_,shadowMapType:R.shadowMap.type,palette:`photo`,view:o,soil:s,tier:`site`,memoryProfile:{pixelRatio:b,maxPixelRatio:x,phone:me,shadowMapSize:fe.shadow.mapSize.x,shadowRadius:fe.shadow.radius,blurTargetDepth:fe.shadow.mapPass?.depthBuffer??null},camera:{verticalFov:25,elevation:ue*180/Math.PI,distance:74,target:le.toArray()},fixedSoilUnplacedTriangles:De,paint:Ze,timings:T,boundaryTextureBytes:ve.reduce((e,t)=>e+t.image.data.byteLength,0)}}function At(){return{resident:{packs:[...k.keys()],pending:[...A,...[...P.keys()].map(e=>`page:${e}`)],failed:Object.fromEntries(ne),steps:[...W.keys()].filter(K).sort((e,t)=>e-t),pages:[...N.keys()],prefetch:{...ct,started:ot}},builds:[...Ke],buildSlots:[...J],uploads:{..._t,steps:[..._t.steps],log:[..._t.log],pending:[...bt?[bt.k]:[],...ht],done:[...gt].sort((e,t)=>e-t),msPerMiB:+(xt*1048576).toFixed(2)},anchorTable:{sourceHash:u?.sourceHash??null},packTimings:{...O.timings},programs:R.info.programs?.length??null}}function jt(){st=!0,St=!0,dt.dispose(),fe.shadow.dispose(),Ye.dispose();for(let e of k.values())for(let{geometry:t}of e.geometries.values())t.dispose();for(let e of[...ke,...[...W.values()].flatMap(e=>e.meshes)])e.geometry.dispose(),e.removeFromParent();for(let e of U.values())e.dispose();for(let e of N.values())for(let t of Object.values(e))t.dispose();for(let e of ve)e.dispose();be.dispose(),et.dispose(),se.background?.dispose?.(),se.traverse(e=>{e.isMesh&&!e.userData.eraSoil&&(e.geometry.dispose(),e.material.dispose?.())}),R.dispose()}return{renderer:R,scene:se,camera:ce,info:Ot,device:kt,metadata:At,dispose:jt,backdrop:{...ho,canvas:(e,t)=>{let[n,r]=z(e,t),i=vo(n,r),a=i.image;return i.dispose(),a}},eraBlock:{base:H.base,top:Xi(-12,-8),bottomY:_e.bottomY},eraDisplacement:tt,eraSite:()=>Ye,applyState:nt,warmState:rt,isResident:it,ensureState:at,prepareAnchors:e=>Ye.prepareAnchors(e),refineAnchors:e=>Ye.refineAnchors(e),anchorStatus:()=>Ye.anchorStatus(),prefetch:ut}}function Lc(e,{get:t=globalThis.fetch.bind(globalThis)}={}){let n=new Map,r=[];function i(e,i){if(!n.has(e)){let a=t(e,i);a.catch(()=>{}),n.set(e,a),r.push(e)}return n.get(e)}function a(e,r){let i=String(e),a=n.get(i);return a?(n.delete(i),a):t(e,r)}async function o(){let t=await i(e+`manifest.json`,{cache:`no-cache`}).then(e=>e.ok?e.clone().json():null).catch(()=>null);if(!t)return[];let n=[...(t.firstView??[]).map(e=>t.packs?.[e]?.file),...(t.firstViewPages??[]).flatMap(e=>Object.values(t.pages?.[e]?.maps??{}).map(e=>e.file))].filter(Boolean);for(let t of n)i(e+t);return n}return{fetch:a,primeFirstView:o,primed:()=>[...r],unclaimed:()=>[...n.keys()]}}var Rc=(e,t)=>Ic(e,t),zc=4,Bc=`/purana-qila-in-layers/site-tier/`;function Vc(){return Rc}function Hc(e){if(typeof e.ensure==`function`)return e;let t=e.pools||{};return{...e,pools:t,has:e=>!!t[e],isResident:e=>!!t[e],get:e=>t[e]??null,ensure:e=>t[e]?Promise.resolve(t[e]):Promise.reject(Error(`Unknown pool `+e)),ensureAll:()=>Promise.resolve(),prefetch:()=>Promise.resolve(),metadata:()=>({source:`v1-loader`,total:Object.keys(t).length,loaded:Object.keys(t)}),dispose(){}}}async function Uc(e,t,n,r,{worldFactory:i=Vc(),poolLoader:a=ss,hudRects:o=()=>[],onMarkerInteraction:s=()=>{},setTitleScale:c=()=>{},onContextLost:l=()=>{}}={}){let u=ms(),d=[],f=e=>d.push({name:e,atMs:+performance.now().toFixed(1)});f(`scene-start`),await ua(),f(`label-font`);let p=document.querySelector(`#viewport`),m=document.querySelector(`#markers`),h=matchMedia(`(prefers-reduced-motion: reduce)`),_=p.getBoundingClientRect(),v=bs(devicePixelRatio),y=_s(),b=[],x=(e,t,n)=>{e.addEventListener(t,n),b.push(()=>e.removeEventListener(t,n))},S=p.querySelector(`.scene-load-status`)||p.appendChild(ut(`p`,`Loading the layers…`,`scene-load-status`));S.setAttribute(`role`,`status`);let C=`scene`,w=({phase:e})=>{C=e,S.textContent={scene:`Loading the layers…`,pools:`Loading feature light fields…`,anchors:`Loading native feature anchors…`,occlusion:`Preparing feature visibility…`,shaders:`Preparing shaders…`,ready:`Ready`}[e]||e},T=document.querySelector(`#scene-poster img`);T&&!T.complete&&await Promise.race([T.decode().catch(()=>{}),new Promise(e=>setTimeout(e,1500))]),await new Promise(e=>requestAnimationFrame(()=>requestAnimationFrame(e))),f(`poster-painted`);let E=y.msaa!==!1,D=Math.round(_.width*v),O=Math.round(_.height*v),ee={};if(i===Rc){let t=Lc(Bc);await t.primeFirstView(),f(`first-view-requested`);let n=performance.now(),r=Fc(e,{antialias:E,preserve:!1,background:`css`});u.record({name:`webgl-context`,startTimeMs:n,durationMs:performance.now()-n}),f(`webgl-context`),ee={renderer:r,background:`css`,assets:{base:Bc,fetch:t.fetch}}}let te=performance.now(),k=await i(e,{width:D,height:O,antialias:E,preserve:!1,view:`turntable`,soil:`eras`,onProgress:w,...ee}),A=null;if(k.backdrop?.canvas){let t=performance.now();A=k.backdrop.canvas(D,O),A.className=`scene-backdrop`,A.setAttribute(`aria-hidden`,`true`),e.before(A),u.record({name:`css-backdrop`,startTimeMs:t,durationMs:performance.now()-t})}u.record({name:i===Rc?`site-tier-world-build`:`native-era-world-build`,startTimeMs:te,durationMs:performance.now()-te}),f(`world-built`),w({phase:`pools`});let ne=Hc(await a({source:new URLSearchParams(location.search).get(`pools`)===`film`?`film`:`site`,onTask:u.record}));f(`pool-manifest`);let re=i===Rc,j=$o(k,{poolCatalog:{pools:ne.records??ne.pools,fieldHashes:ne.fieldHashes,manifest:ne.manifest},onProgress:w,displaceInWorker:re}),M=new jo(k.camera,e),N=Math.PI/180,P=vs(k.renderer),ie=ys(k,y),F=gs();k.camera.position.fromArray(F.position),M.target.set(-1.4,-3.85,0),M.minAzimuthAngle=-45*N,M.maxAzimuthAngle=115*N,M.minPolarAngle=20*N,M.maxPolarAngle=85*N,M.minDistance=31,M.maxDistance=104,M.enablePan=!1,M.enableDamping=!h.matches,M.dampingFactor=.08,M.autoRotate=!1,M.update(),M.saveState(),k.renderer.shadowMap.autoUpdate=!1,k.renderer.shadowMap.needsUpdate=!0;let I=it(2023),L=structuredClone(I),ae=0,R=!1,z=!0,B=!1,oe=null,se=0,ce=v,le,V=!1,ue=!1,de,fe=_.width+`x`+_.height,pe=!1,me=null,he=null,ge=null,H=0,_e=0,ve=null,ye=null,be=[],xe=Ss(()=>{B=!0,Kt()}),Se=new Map(t.map(e=>[e.id,e])),U=new Map,Ce=n.sections.slice(2,12).flatMap((e,t)=>e.callouts.map((e,n)=>({featureId:e.featureId,eraIndex:t,slot:n,calloutId:ft[t][n]}))),we=null,Te=null,Ee=null,De=!1,Oe=Array.from({length:10},(e,t)=>Ce.filter(e=>e.eraIndex===t&&ne.has(e.featureId)).map(e=>e.featureId)),ke=e=>!Number.isInteger(e.eraIndex)||Oe[e.eraIndex].every(ne.isResident),Ae=e=>Number.isInteger(e.eraIndex)?ne.ensureAll(Oe[e.eraIndex]):Promise.resolve(),je=e=>j.isResident(e)&&ke(e),Me=e=>Promise.all([j.ensureState(e),Ae(e)]).then(()=>{}),W=es(k.scene,{catalog:ne,onPoolReady:()=>{z=!0,Kt()},powers:Object.fromEntries(Ce.map(e=>[e.featureId,ls[e.calloutId]??0])),anchorFor(e){let t=Tt(e),n=U.get(e);return t?{...t,opacity:n?L.features[n.eraIndex]:0}:null},visible:e=>U.get(e)?.lastVisible===!0});function Ne(){W.setActive(we||Ee||Te),z=!0,Kt()}function Pe(e){we=e,e||(Te=Ee=null),Ne()}for(let e of Ce){let t=Se.get(e.featureId);if(!t)continue;let n=ut(`button`,void 0,`marker`),i=ut(`span`,t.title,`callout-label`);i.hidden=!0,n.append(i),n.setAttribute(`aria-label`,t.title),n.dataset.featureId=t.id,x(n,`click`,()=>{s(),Pe(t.id),r(t.id)}),x(n,`pointerenter`,()=>{s(),Te=t.id,Ne()}),x(n,`pointerleave`,()=>{Te===t.id&&(Te=null),Ne()}),x(n,`focus`,()=>{s(),Ee=t.id,Ne()}),x(n,`blur`,()=>{Ee===t.id&&(Ee=null),Ne()}),n.hidden=!0,m.append(n),U.set(t.id,{button:n,label:i,lastVisible:!1,...e})}let Fe=document.createElement(`canvas`).getContext(`2d`),G=m.querySelector(`#leaders`)||m.appendChild(document.createElementNS(`http://www.w3.org/2000/svg`,`svg`));G.id=`leaders`;let Ie,K,Le,Re=new Map;function ze(){Ie=vt(p.clientWidth,p.clientHeight),Fe.font=`600 100px "Strata Sans"`;let e=Ie.cap*100/Fe.measureText(`H`).actualBoundingBoxAscent;K=`600 ${e}px "Strata Sans"`,Fe.font=K;let t=Fe.measureText(`Hg`);Le={size:e,ascent:t.fontBoundingBoxAscent,descent:t.fontBoundingBoxDescent},Re.clear();for(let{label:t}of U.values())t.style.fontSize=`${e}px`,t.style.lineHeight=`${Ie.lineHeight}px`}function Be(e){let t=K+`|`+e;if(Re.has(t))return Re.get(t);Fe.font=K;let n=Fe.measureText(e),r={width:Math.max(n.width,n.actualBoundingBoxRight)+2,height:n.actualBoundingBoxAscent+n.actualBoundingBoxDescent+2,ascent:n.actualBoundingBoxAscent+1};return Re.set(t,r),r}function q(e,t){let n=e.label.dataset.text||e.label.textContent,r=e=>Be(e).width,i=yt(n,Ie.wrapWidth,r,{noSingleLast:!0})||yt(n,Ie.wrapWidth,r)||[e.label.textContent],a=i.map(Be),o=Ie.lineHeight,s=a.length>1?Math.max(...a.slice(1).map((e,t)=>o-(a[t].height-a[t].ascent)-e.ascent)):0;return{id:e.featureId,featureId:e.featureId,lines:i,lineHeight:o,em:Le.size,lineGap:s,ascent:Math.max(...a.map(e=>e.ascent)),boxWidth:Math.max(...a.map(e=>e.width)),boxHeight:Math.max(...a.map(e=>e.height))+(i.length-1)*o,anchor:t}}for(let{label:e}of U.values())e.dataset.text=e.textContent;ze();let J=Cs({onTask:u.record,displacedKind:j.displacedKind});re&&(await J.loadStack(Bc),f(`occlusion-grids`));let Y=()=>j.occluders();w({phase:`occlusion`});let X=ut(`p`,void 0,`state-note`);X.setAttribute(`role`,`status`),X.hidden=!0,(document.querySelector(`.scrubber`)||p).append(X);let Ve=us({isResident:je,ensureState:Me,onReady:()=>{z=!0,k.renderer.shadowMap.needsUpdate=!0,Kt()},onNote(e){if(X.hidden=!e,e===`loading`)X.textContent=`Loading this step…`;else if(e===`failed`){let e=ut(`button`,`Retry`,`state-retry`);e.addEventListener(`click`,()=>Ve.retry()),X.replaceChildren(`Couldn't load this step. `,e)}}}),He=Ms(k.scene,m),Ue=performance.now(),We=k.camera.clone();We.aspect=st.width/st.height,We.zoom=1,We.clearViewOffset(),We.updateProjectionMatrix(),We.updateMatrixWorld();async function Ge(){let e=it(2013);await j.ensureState(e),j.applyState(e,{anchors:`nearest`});let t=Y();return await J.prepare(t),J.silhouette(t,{roleOf:j.roleOf,camera:We,...st,deposits:j.appliedDeposits()})}let Ke=Ps(We,st),qe=new URLSearchParams(location.search).get(`framing`)===`live`,Je=qe?null:Fs(Ke,mt),Ye=`shipped`;Je||=(mt.rows&&!qe&&console.warn(`Shipped framing reference was made for another reference camera; rastering it live`),Ye=`live`,await Ge());let Xe=xt(Je),Ze=[];for(let e of[He.placement.x0,He.placement.x1])for(let t of[He.placement.bottom,He.placement.top])for(let n of[He.placement.z,He.placement.zBack]){let r=new g(e,t,n).project(We);Ze.push({x:(r.x+1)*st.width/2,y:(1-r.y)*st.height/2})}let Qe={x0:Math.min(...Ze.map(e=>e.x)),x1:Math.max(...Ze.map(e=>e.x)),y0:Math.min(...Ze.map(e=>e.y)),y1:Math.max(...Ze.map(e=>e.y))},$e=(e,t)=>xt({...Je,rows:ct(Je,Qe,t,e)});u.record({name:`framing-reference`,startTimeMs:Ue,durationMs:performance.now()-Ue}),f(`framing-reference`),await Me(L),j.applyState(L,{anchors:`nearest`}),await J.prepare(Y()),f(`initial-state`);let et=null;function nt(e,t){let n=He.update(k.camera,e,t);return{gap:n.gap,cap:n.cap,halfWidth:Math.max(...n.labelWidths)/2+2}}function rt(){let e=p.clientWidth,t=p.clientHeight;ze(),c(1),pt(k.camera,null,e,t),k.camera.updateMatrixWorld();let n=nt(e,t),r=lt({width:e,height:t,referenceFor:e=>$e(e,n),hudFor:e=>(c(e),o({worstCase:!0})),metrics:Ie,warn:console.warn});et=r.framing,r.reference,c(et.feasible?et.titleScale:1),pt(k.camera,et.feasible?et:null,e,t),M.zoom0=k.camera.zoom,k.camera.updateMatrixWorld(),bt=null,z=!0}let bt=null;if(rt(),f(`reframe`),typeof k.renderer.compileAsync==`function`){w({phase:`shaders`});let e=performance.now();await k.renderer.compileAsync(k.scene,k.camera),u.record({name:`shader-compile-async`,startTimeMs:e,durationMs:performance.now()-e,programs:k.renderer.info.programs?.length??null,parallel:k.renderer.extensions?.has?.(`KHR_parallel_shader_compile`)??null}),f(`shaders`)}w({phase:`ready`}),S.hidden=!0,f(`ready`);let St=Number.isInteger(L.eraIndex)?L.eraIndex:9,Ct=[...Oe.keys()].sort((e,t)=>Math.abs(e-St)-Math.abs(t-St)||t-e).flatMap(e=>Oe[e]),Z=new Promise(e=>requestAnimationFrame(()=>e(ne.prefetch(Ct).catch(e=>console.warn(`Pool prefetch stopped`,e))))),Q=null,wt=new AbortController;if(re){let e=()=>new Promise(e=>typeof requestIdleCallback==`function`?requestIdleCallback(e,{timeout:4e3}):setTimeout(e,200));(async()=>{for(await Z;!k.metadata?.().resident?.prefetch?.finished;){if(wt.signal.aborted)return;await new Promise(e=>setTimeout(e,500))}let t=j.displacedMeshes(),n=performance.now();Q={startedAtMs:+n.toFixed(1),meshes:t.length,warmed:0};for(let n of t){if(await e(),wt.signal.aborted)return;await J.warm(n,j.appliedDeposits()),Q.warmed++}let r=performance.now(),i=d.find(e=>e.name===`ready`)?.atMs??null;Q={...Q,doneAtMs:+r.toFixed(1),durationMs:+(r-n).toFixed(1),readyToDoneMs:i===null?null:+(r-i).toFixed(1),steps:k.metadata().resident.steps.length,memory:await J.memory()}})().catch(e=>{wt.signal.aborted||(console.warn(`Occlusion warm stopped`,e),Q={...Q,stopped:String(e?.message??e)})})}if(j.interactiveAnchors){let e=()=>{let e=performance.now();ye={startedAtMs:+e.toFixed(1)},j.prepareAnchors({signal:wt.signal}).then(t=>{ye={...ye,doneAtMs:+performance.now().toFixed(1),durationMs:+(performance.now()-e).toFixed(1),result:t??null}},e=>{wt.signal.aborted||console.warn(`Anchor preparation stopped`,e),ye={...ye,stopped:String(e?.message??e)}})};typeof requestIdleCallback==`function`?requestIdleCallback(e,{timeout:3e3}):setTimeout(e,500)}function Tt(e){let t=j.marker(e),n=me?.from.get(e);if(!n||!t?.visible)return t;let r=Math.min(1,(performance.now()-me.start)/150),i=r*r*(3-2*r);return{...t,point:t.point.map((e,t)=>n[t]+(e-n[t])*i)}}let Et={revision:null,count:0},Dt=!1,Ot=0,kt=e=>typeof requestIdleCallback==`function`?requestIdleCallback(e,{timeout:1e3}):setTimeout(e,200);function At(){he?.abort(),he=null,me=null,H=performance.now()}async function jt(){let e=new AbortController,t=performance.now(),n=H,r=j.metadata().stateRevision;he=e;let{outcome:i,refined:a,failure:o}=await hs({refine:e=>j.refineAnchors(e),signal:e.signal,isCurrent:()=>he===e&&j.metadata().stateRevision===r});if(he===e&&(he=null),i===`superseded`)return;if(i===`fallback`){Et.revision!==r&&(Et={revision:r,count:0}),Et.count++,Et.count===1?kt(()=>{!he&&j.anchorMode()===`nearest`&&j.metadata().stateRevision===r&&jt()}):Dt||(Dt=!0,console.warn(`Exact anchors unavailable; keeping nearest anchors`,o??`no result`));return}let s=new Map;for(let e of U.keys()){let t=Tt(e);t?.visible&&s.set(e,t.point)}let c=j.commitAnchors(a);if(!c)return;ge=c.stateRevision;let l=performance.now(),u=0;for(let[e,t]of s){let n=j.marker(e);n?.visible&&n.point.some((e,n)=>Math.abs(e-t[n])>1e-6)&&u++}me=u&&!h.matches?{from:s,start:l}:null;let d=me?150:0;ve={startedAtMs:+t.toFixed(1),committedAtMs:+l.toFixed(1),refineMs:+(l-t).toFixed(1),settledAfterStateMs:+(l-n+d).toFixed(1),lastInputAtMs:+_e.toFixed(1),easeMs:d,moved:u,status:j.anchorStatus()},be.push(ve),be.length>50&&be.shift(),z=!0,Kt()}function Mt(e){let t=Tt(e.featureId);return t?.visible?new g(...t.point):null}function Nt(e,t){let n=j.markerRecord(e.featureId),r=Mt(e),i=r?.clone().project(k.camera);return{record:e,point:r,projected:i,...Ts({anchor:n,featureOpacity:L.features[e.eraIndex],projected:i,workerVisible:t})}}le=ws({blocked:()=>xe.inputActive()||V||ue||j.anchorMode()===`nearest`,defer:e=>setTimeout(e,0),async query(e,t){let n=performance.now(),r=await j.occludersSliced({valid:e});if(!r||!e())return null;u.record({name:`occluder-proxies`,startTimeMs:n,durationMs:performance.now()-n,...j.occluderStats()});let i=j.appliedDeposits();if(await J.prepare(r),!e())return null;let a=j.metadata().stateRevision,o=[...U.values()].map(e=>{let t=Nt(e);if(!t.eligible)return t;let n=t.point.clone().sub(k.camera.position);return{...t,ray:{origin:k.camera.position.toArray(),direction:n.clone().normalize().toArray(),far:Math.max(0,n.length()-1e-4)}}}),s=o.filter(e=>e.eligible),c=await J.query(r,s.map(e=>e.ray),{deposits:i});if(!e())return null;let l=0,d=o.map(e=>{let t=e.eligible?c[l++]:void 0;return{id:e.record.featureId,visible:t===!0,stateRevision:a,...e.eligible?Nt(e.record,t):{reason:e.reason,detail:e.detail}}});t(d);let f=Bt(),m=await J.silhouette(r,{roleOf:j.roleOf,camera:k.camera,width:p.clientWidth,height:p.clientHeight,cell:zc,deposits:i});if(!e()||(await new Promise(e=>setTimeout(e,0)),!e()))return null;let h=performance.now(),g=_t(m.rows,m);return u.record({name:`silhouette-build`,startTimeMs:h,durationMs:performance.now()-h}),await new Promise(e=>setTimeout(e,0)),e()?(Lt={key:f,silhouette:g,report:m.report},d):null},preview(e){let t=performance.now();It(e),Ht(),u.record({name:`occlusion-visibility-apply`,startTimeMs:t,durationMs:performance.now()-t}),Kt()},commit(e){let t=performance.now();Lt&&=(bt=Lt,null),It(e),Ht(),u.record({name:`occlusion-apply`,startTimeMs:t,durationMs:performance.now()-t}),Kt()}});let Pt=!1,Ft=!1;function It(e){!Pt&&e.some(e=>e.visible)&&(Pt=!0,f(`dots-visible`));for(let t of e)Object.assign(U.get(t.id),{lastVisible:t.visible,visibilityReason:t.reason,visibilityDetail:t.detail,occlusionStateRevision:t.stateRevision})}let Lt=null,Rt=null,zt={fresh:!1,placed:[],failures:[],audit:null,hudClearances:[]},Bt=()=>[j.metadata().stateRevision,p.clientWidth,p.clientHeight,...k.camera.projectionMatrix.elements,...k.camera.matrixWorldInverse.elements].join(`,`);function Vt(e,t,n,r,i,a){let o=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);for(let[s,c]of Object.entries({x1:e,y1:t,x2:n,y2:r,stroke:i,"stroke-width":a,"stroke-linecap":`round`}))o.setAttribute(s,c);return o}function Ht(){let e=p.clientWidth,t=p.clientHeight,n=new Map;for(let r of U.values()){let i=Mt(r),a=i?.clone().project(k.camera),o=r.lastVisible&&!!i;if(r.labelWasShown=!r.label.hidden,r.button.hidden=!o,r.label.hidden=!0,!o)continue;let s=(a.x+1)*e/2,c=(1-a.y)*t/2;n.set(r.featureId,{x:s,y:c}),r.button.style.left=`${s}px`,r.button.style.top=`${c}px`}G.replaceChildren();let r=L.eraIndex,i=we||Ee||Te,a=r+`:`+(i||``)+`:`+e+`x`+t,s=Number.isInteger(r)?[...U.values()].filter(e=>e.eraIndex===r&&n.has(e.featureId)).sort((e,t)=>e.slot-t.slot).map(e=>q(e,n.get(e.featureId))):[],c=i&&n.has(i)&&!s.some(e=>e.featureId===i)?U.get(i):null,l=c?q(c,n.get(i)):null,u=Rt?.key===a?Rt.offsets:null;if(!(bt&&bt.key===Bt())){let e=u?dt([...s,...l?[l]:[]],u):[];Wt(e),zt={fresh:!1,held:e.length>0,placed:e.map(e=>({id:e.id,featureId:e.featureId,rect:e.rect,anchor:e.anchor,end:e.end,length:e.length,lines:e.lines})),failures:[],audit:null,hudClearances:[]};return}let d=o(),m=He.update(k.camera,e,t),h=m.labels.map(e=>({id:`scale:`+e.text,rect:e.rect,em:e.cap/.66,lineGap:0})),g=ot({era:s,extra:l,silhouette:bt.silhouette,protectedRects:d.map(e=>e.rect),scaleZones:m.polygon?[m.polygon]:[],scaleLabels:h,width:e,height:t,margin:Ie.margin,previous:u});Rt={key:a,offsets:gt(g.placed)},Wt(g.placed),!Ft&&g.placed.length&&(Ft=!0,f(`labels-visible`)),zt={fresh:!0,held:g.placed.some(e=>e.held),placed:g.placed.map(e=>({id:e.id,featureId:e.featureId,rect:e.rect,anchor:e.anchor,end:e.end,length:e.length,clearance:e.clearance,lines:e.lines,em:e.em,lineGap:e.lineGap,held:!!e.held,kind:s.some(t=>t.id===e.id)?`era`:`active`})),failures:g.failures,audit:ht(g.placed,bt.silhouette),hudClearances:d.map(e=>({id:e.id,rect:e.rect,clearance:bt.silhouette.distanceRect(e.rect)})),scaleLabels:h,scaleLabelHudGaps:h.flatMap(e=>d.map(t=>({label:e.id,hud:t.id,gap:at(tt(e.rect),tt(t.rect))}))),metrics:{...Ie,fontSize:Le.size},silhouette:bt.report}}function Ut(e,t){for(let t of e.getAnimations?.()??[])t.cancel();let n=e.animate?.([{opacity:0},{opacity:1}],{duration:120,easing:`ease-out`});n&&(n.currentTime=t)}function Wt(e){let t=(Ie.lineHeight-Le.ascent-Le.descent)/2,n=performance.now();for(let r of e){let e=U.get(r.featureId),i=e.button.offsetWidth/2;e.label.textContent=r.lines.join(`
`),e.label.hidden=!1,e.label.style.left=`${r.rect.x+1-r.anchor.x+i}px`,e.label.style.top=`${r.rect.y+r.ascent-t-Le.ascent-r.anchor.y+i}px`;let a=[Vt(r.end.x,r.end.y,r.anchor.x,r.anchor.y,`#101212`,3),Vt(r.end.x,r.end.y,r.anchor.x,r.anchor.y,`#d0c5ae`,1)];G.append(...a),e.labelWasShown||(e.labelShownAt=n);let o=n-(e.labelShownAt??-1/0);if(o<120&&!h.matches){e.labelWasShown||Ut(e.label,0);for(let e of a)Ut(e,o)}}}function Gt(t=1/60){let n=performance.now();if(B){ce=xe.ratio(Math.min(bs(oe??devicePixelRatio),y.dprCap??1/0));let t=Math.round(p.clientWidth*ce),n=Math.round(p.clientHeight*ce);(e.width!==t||e.height!==n)&&k.renderer.setSize(t,n,!1),fe!==p.clientWidth+`x`+p.clientHeight&&(fe=p.clientWidth+`x`+p.clientHeight,rt(),z=!0),k.camera.aspect=p.clientWidth/p.clientHeight,k.camera.updateProjectionMatrix(),B=!1}if(Ve.check(L)){let e=j.applyState(L,{anchors:`nearest`});e.stateRevision!==ge&&(ge=e.stateRevision,At())}He.update(k.camera,p.clientWidth,p.clientHeight),z&&=(Ht(),le.invalidate(),!1),De=W.update(t,{immediate:h.matches}),k.renderer.info.reset(),k.renderer.autoClear=!0;let r=performance.now();k.renderer.render(k.scene,k.camera);let i=performance.now()-r;return se===0&&(u.record({name:`first-render`,startTimeMs:r,durationMs:i,programs:k.renderer.info.programs?.length??null}),f(`first-render`),requestAnimationFrame(()=>{f(`first-presented`);let e=document.querySelector(`#scene-poster`);e&&(e.classList.add(`gone`),setTimeout(()=>e.remove(),400))})),se++,le.update(),de={renderSubmitMs:i,jsMs:performance.now()-n-i},de}function Kt(){Jt.invalidate()}function qt(e){let t=ae?Math.min(.1,(e-ae)/1e3):1/60;ae=e;let n=!1,r=xe.isActive(`scrub`)||pe;pe=!1;let i=h.matches||r?1:1-Math.exp(-t/.09);for(let e of[`deposits`,`features`])for(let t=0;t<10;t++){let r=I[e][t]-L[e][t];Math.abs(r)>5e-4&&(n=!0),L[e][t]=Math.abs(r)<5e-4?I[e][t]:L[e][t]+r*i}let a=I.excavation-L.excavation;Math.abs(a)>5e-4&&(n=!0),L.excavation=Math.abs(a)<5e-4?I.excavation:L.excavation+a*i,L.eraIndex=I.eraIndex,n&&(k.renderer.shadowMap.needsUpdate=!0,z=!0);let o=!!me&&performance.now()-me.start<150;me&&(z=!0,o||(me=null));let s=M.update();V=n||s||o,Gt(t),(V||De)&&Kt(),n||s||xe.isActive(`orbit`)||he||j.anchorMode()!==`nearest`||Et.revision===j.metadata().stateRevision||jt()}let Jt=xs(qt);x(M,`change`,()=>{z=!0,Kt()}),x(M,`start`,()=>{xe.begin(`orbit`),he&&(he.abort(),he=null,Ot++)}),x(M,`end`,()=>xe.end(`orbit`)),x(e,`dblclick`,()=>{M.reset(),Kt()});let Yt=!1;x(e,`webglcontextlost`,e=>{e.preventDefault(),Yt||(Yt=!0,Jt.pause(),he?.abort(),m.hidden=!0,l())}),x(h,`change`,()=>{M.enableDamping=!h.matches,L=structuredClone(I),k.renderer.shadowMap.needsUpdate=!0,Kt()});function Xt(e){e!==void 0&&(oe=e),B=!0,z=!0,Kt()}x(window,`resize`,()=>Xt());let{backend:Zt,warmState:Qt}=fs(k),$t=new Promise((e,t)=>requestAnimationFrame(()=>requestAnimationFrame(()=>{ps(e=>j.isResident(e)?Qt(e):null,{onTask:u.record}).then(e,t)})));$t.catch(e=>console.error(`Excavation warming failed`,e));let en=(e,t)=>[...e].sort((e,t)=>e-t)[Math.max(0,Math.ceil(e.length*t)-1)];return{setYear(e,t=!1){Ve.retry(),I=it(e),(t||h.matches)&&(L=structuredClone(I)),z=!0,k.renderer.shadowMap.needsUpdate=!0,Kt()},setActiveFeature:Pe,async verifyFraming(){Jt.pause();let e={raster:Je,reference:Xe},t=()=>{if(!et?.feasible)throw Error(`Framing infeasible: `+et?.reason);return{k:et.k,centre:{...et.centre},mode:et.mode}};try{let n=await Ge();await Me(L),j.applyState(L,{anchors:`nearest`}),await J.prepare(Y()),le?.invalidate(),rt();let r={...e,framing:t()};Je=n,Xe=xt(n),rt();let i={raster:n,reference:Xe,framing:t()};return{width:p.clientWidth,height:p.clientHeight,source:Ye,key:Ke,rowsEqual:Ls(e.raster,n),displacementPx:Bs(r,i),framingInUse:r.framing,framingLive:i.framing,liveRecord:Is(Ke,n,`sceneForYear(2013) rastered live at the hero pose`)}}finally{Je=e.raster,Xe=e.reference,rt(),z=!0,k.renderer.shadowMap.needsUpdate=!0,Jt.resume(),Kt()}},markerReport(){return[...U.values()].map(e=>{let t=e.occlusionStateRevision===j.metadata().stateRevision,n=Nt(e,t?e.lastVisible:void 0),r=n.projected?{x:(n.projected.x+1)*p.clientWidth/2,y:(1-n.projected.y)*p.clientHeight/2,z:n.projected.z}:null;return{featureId:e.featureId,title:e.label.textContent,visible:!e.button.hidden,reason:n.reason,detail:n.detail,nativeAnchor:j.markerRecord(e.featureId),projectedCSS:r,featureOpacity:L.features[e.eraIndex],workerStateRevision:e.occlusionStateRevision??null,currentStateRevision:j.metadata().stateRevision,workerFresh:t,labelVisible:!e.button.hidden&&!e.label.hidden}})},beginInteraction:e=>{_e=performance.now(),xe.begin(e)},endInteraction:e=>{_e=performance.now(),e===`scrub`&&xe.isActive(`scrub`)&&(pe=!0),xe.end(e),Kt()},pulseInteraction:()=>{_e=performance.now(),xe.pulse()},invalidate:Kt,reset(){M.reset(),Kt()},device:()=>k.device?.()??null,gpuMemory(){let t=new Map,n=new Map,r=e=>e.generateMipmaps&&![1003,1006].includes(e.minFilter),i=e=>{if(!e?.isTexture||n.has(e))return;let t=e.image;n.set(e,t?.data?.byteLength??(t?.width&&t?.height?t.width*t.height*4*(r(e)?4/3:1):0))};k.scene.traverse(e=>{if(!e.geometry)return;let n=e.geometry;for(let e of[...Object.values(n.attributes),n.index])if(e){let n=e.isInterleavedBufferAttribute?e.data.array:e.array;t.set(n,n.byteLength)}for(let t of[e.material].flat().filter(Boolean)){for(let e of Object.values(t))i(e);for(let e of[...Object.values(t.uniforms??{}),...Object.values(t.userData?.siteUniforms??{})])i(e?.value)}});let a=k.device?.()??{},[o,s]=a.drawingBuffer??[e.width,e.height],c=a.samples??0,l=a.memoryProfile?.shadowMapSize??2048,u=e=>[...e.values()].reduce((e,t)=>e+t,0),d=u(t),f=Math.round(u(n)),p=l*l*16,m=o*s*8*Math.max(1,c)+o*s*4,h=d+f+p+m;return{geometryBytes:d,textureBytes:f,textureCount:n.size,shadowBytes:p,framebufferBytes:m,drawingBuffer:[o,s],samples:c,totalBytes:h,totalMB:+(h/1048576).toFixed(1),info:{...k.renderer.info.memory,programs:k.renderer.info.programs?.length??null}}},async silhouetteStudy({cells:e=[1,2,3,4,6,8],repeats:t=3}={}){let n=j.occluders(),r=j.appliedDeposits(),i=p.clientWidth,a=p.clientHeight,o={layout:bt,heldLabels:Rt},s=[];await J.prepare(n);try{for(let o of e){let e=[],c;for(let s=0;s<t;s++){let t=performance.now();c=await J.silhouette(n,{roleOf:j.roleOf,camera:k.camera,width:i,height:a,cell:o,deposits:r}),e.push(performance.now()-t)}let l=performance.now(),u=_t(c.rows,c),d=performance.now()-l;bt={key:Bt(),silhouette:u,report:c.report},Rt=null;let f=performance.now();Ht();let p=performance.now()-f;s.push({cell:o,roundTripMs:e.map(e=>+e.toFixed(1)),medianMs:+[...e].sort((e,t)=>e-t)[Math.floor(e.length/2)].toFixed(1),buildMs:+d.toFixed(1),layoutMs:+p.toFixed(1),placed:zt.placed.map(e=>({id:e.id,rect:e.rect,anchor:e.anchor,end:e.end})),failures:zt.failures?.length??0})}}finally{bt=o.layout,Rt=o.heldLabels,z=!0,Kt()}let c=s[0],l=e=>{let t=0,n=0;for(let r of c.placed){let i=e.placed.find(e=>e.id===r.id);i?t=Math.max(t,...[`x`,`y`].map(e=>Math.abs(r.rect[e]-i.rect[e])),...[`x`,`y`].map(e=>Math.abs(r.end[e]-i.end[e]))):n++}return{maxShiftPx:+t.toFixed(2),missing:n,extra:e.placed.filter(e=>!c.placed.some(t=>t.id===e.id)).length}};return{width:i,height:a,baselineCell:c.cell,labels:c.placed.length,results:s.map(({placed:e,...t})=>({...t,...l({placed:e})}))}},metadata(){return{...j.metadata(),contextLost:Yt,loadPhase:C,loadTimeline:[...d],pools:ne.metadata(),programs:k.renderer.info.programs?.length??null,residency:Ve.metadata(),emphasis:{...W.metadata(),calibrationStatus:cs,siteVisualReview:`Pending P2 tier`},anchors:{interactive:j.interactiveAnchors,mode:j.anchorMode(),refining:!!he,refineFailures:{...Et},refineAbortsByCamera:Ot,occlusionWarm:re?Q:`n/a (native world)`,easing:!!me,preparation:ye,lastRefinement:ve,refinements:[...be],applies:j.applyReport(),status:j.anchorStatus()},hasReconstructionOutline:!1,renderOnDemand:!0,renderCount:se,devicePixelRatio:devicePixelRatio||1,maxPixelRatio:2,effectiveDpr:ce,scheduler:Jt.metadata(),resolution:xe.metadata(),occlusion:{...le.metadata(),...J.metadata()},lastFrameTiming:de,warmBackend:Zt,warmCacheCapacity:Zt===`scene-kit`?4:null,taskReport:u.report(),capHeightCSSPixels:Ie.cap,maximumLabelCount:3,layout:zt,scaleBar:He.metadata(),framing:{...et,reference:{bounds:Xe.bounds,barBox:Qe,...st,state:`sceneForYear(2013), full pre-excavation block`,source:Ye,shippedKeyMatches:mt.key===Ke}},camera:{zoom:k.camera.zoom,viewOffset:k.camera.view?{x:k.camera.view.offsetX,y:k.camera.view.offsetY}:null,heroAzimuthDegrees:35,azimuthRangeDegrees:[-45,115],polarRangeDegrees:[20,85],distanceMetres:[31,104]},yearInterpolationNote:`Modern-fill progress between 1800 and 2013 is an S1 control interpolation, not an archaeological date range.`}},dispose(){Jt.pause(),he?.abort(),wt.abort();for(let e of b)e();le.invalidate(),J.dispose(),W.dispose(),ne.dispose(),j.dispose(),M.dispose(),u.dispose();for(let e of U.values())e.button.remove();He.dispose(),S.remove(),X.remove(),A?.remove()},async benchmark({frames:e=120,warmup:t=20,dpr:n=1,pauseAfter:r=!1,mode:i=`static`,interactionRatio:a}={}){let o=await $t;if(![`static`,`orbit`,`scrub`].includes(i))throw Error(`Unknown benchmark mode`);if(R)throw Error(`Benchmark already running`);R=!0,Jt.pause();let s={current:structuredClone(L),target:structuredClone(I),position:k.camera.position.clone(),quaternion:k.camera.quaternion.clone(),targetPoint:M.target.clone()},c=s.position.clone().sub(M.target);ue=i!==`static`,V=!1;let l=J.metadata().queries;a!==void 0&&xe.setInteractionRatio(a),ue&&xe.begin(`benchmark`),Xt(n);let d=[],f=[],m=[],h=[],_,v=null;try{return await new Promise(n=>{let r=-t;function a(o){r>=0&&_!==void 0&&d.push(o-_),r===0&&(v=o),_=o;let s=performance.now();i===`orbit`&&(k.camera.position.copy(c).applyAxisAngle(new g(0,1,0),Math.sin((r+t)*.025)*.04).add(M.target),k.camera.lookAt(M.target),k.camera.updateMatrixWorld(),z=!0),i===`scrub`&&(L=it(-539+2562*((r+t)%90)/89),k.renderer.shadowMap.needsUpdate=!0,z=!0);let l=Gt();r>=0&&(f.push(l.renderSubmitMs),h.push(performance.now()-s),m.push(h.at(-1)-l.renderSubmitMs)),r++,r<e?requestAnimationFrame(a):n()}requestAnimationFrame(a)}),{frames:e,width:p.clientWidth,height:p.clientHeight,dpr:n,effectiveDpr:ce,mode:i,interactionRatio:xe.metadata().interactionPixelRatio,firstFrameTimestampMs:v,gpuIdentity:P,diagnosticReport:ie,visibilityState:document.visibilityState,p50FrameMs:en(d,.5),p95FrameMs:en(d,.95),p50SubmitMs:en(f,.5),p95SubmitMs:en(f,.95),p95JsMs:en(m,.95),p95MainThreadMs:en(h,.95),rawFrameMs:d,rawSubmitMs:f,rawJsMs:m,rawMainThreadMs:h,occlusionRaysDuringBenchmark:J.metadata().queries-l,targetP95Ms:16.7,passes:en(d,.95)<=16.7,warmBackend:Zt,warmTasks:o,...u.report(),caveat:`rAF intervals are not GPU timer queries. JS excludes renderer.render; render-submit includes CPU/driver work, not isolated GPU execution. Interactive frames project markers but launch no occlusion rays. Scrub refreshes existing shadows; geometry/materials unchanged.`}}finally{L=s.current,I=s.target,k.camera.position.copy(s.position),k.camera.quaternion.copy(s.quaternion),M.target.copy(s.targetPoint),k.camera.updateMatrixWorld(),z=!0,k.renderer.shadowMap.needsUpdate=!0,i!==`static`&&xe.end(`benchmark`,0),a!==void 0&&xe.setInteractionRatio(void 0),ue=!1,V=!1,oe=null,R=!1,Xt(),r||Jt.resume()}}}}export{Uc as createSiteScene};