const version = 0.019;

let image_url = "";//"https://sun9-75.userapi.com/impf/c841324/v841324325/2052e/9OXxiEwdOqY.jpg?size=1280x1104&quality=96&sign=4afb1878280e0a25b52ae95f4d6a6363&type=album";

let mobile = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) mobile = true;
if (mobile) image_url = "";































let frameskip = false;
p5.disableFriendlyErrors = true;

// =============================== vert shader

let glsl_vert = ` 
attribute vec3 aPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord;
void main() {  
  vTexCoord = aTexCoord; vec4 positionVec4 = vec4(aPosition, 1.0);  
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0; gl_Position = positionVec4; 
}`;

//////////////////////////////////////////

// =============================== frag shader

let glsl_frags = [];  // create array of fragment shaders for filtering
let allow_blur = [];  // create boolean array of blur-enabling for shaders.

function shader_update(str,exp=false) {  // Rebuild all shaders with new code

  filter = str;                 // load new text into global variable
  glsl_frags = [];              // clear all shaders code
  let f = filter.split('#');    // get the number of shaders in new filter
  
  let check = str.replace(/:/g, "").split('#');   // enable empty shader protection
  let glsl_txt = '';                              // create a variable for txt export
  for (let i = 0; i < f.length; i++) {            // for every part of new filter text
    if (f[i]!=null && check[i]!='' || i==0)       // if new shader is not empty
      glsl_frags[i] = shader_create(f[i],i);      // build a code for new shader
      glsl_txt += '############### SHADER '+(i+1)+' ############### \n\n\n\n\n' + glsl_frags[i] + '\n\n\n\n\n';
  }
  if (exp) save([glsl_txt],     // export all shaders in the txt file
    "stf-" + 
    filter_name + '-' +
    convert(filter_temp).replace(/:/g,"'") +
    '-shader.txt');
  for (let i = 0; i < glsl_frags.length; i++) {               // for every built code
      shd[i] = imgX.createShader(glsl_vert, glsl_frags[i]);   // create the new shader
  }
  
}

function shader_create(str,l) {  // building shader code

let txm,txb;  // variables for sampler2D of main and background textures

function set_xy(str='') {  // set control variables

  let f = str.slice(0,-1).split(','); // delete ')' and separate x and y
  let out = ``;
  
  if (str!="") {  // add variables to the shader code
    out += '  // :: set values :: \n'
    if (f[0]!=null && f[0]!='') out += `    kx = `+f[0]+`; `+'\n';
    if (f[1]!=null && f[1]!='') out += `    ky = `+f[1]+`; `+'\n';
    out +='\n';
  }
  
  return out;
  
}

function sel_tx(n, str='') {  // select main and background textures

  let f = str.split('-'); // split the string to separate keys
  dict = {};

  dict["imi"] = ` // [ , ] Load Input Image
    img`+n+` = texture2D(imi_input, uv`+n+`);
  `;

  dict["imt"] = ` // [ , ] Load Transferred Image
    img`+n+` = texture2D(imt_input, uv`+n+`);
  `;
  
  dict["imo"] = ` // [ , ] Load Output Image (Feedback)
    img`+n+` = texture2D(imo_input, uv`+n+`);
  `;
  
  dict["imb"] = ` // [ , ] Load Blurred Image
    img`+n+` = texture2D(imb_input, uv`+n+`);
  `;
  
  // --------------------------------------
  
  tx_desc = Object.values(dict);                    // create descriptions
  for (let i = 0; i < tx_desc.length; i++) { tx_desc[i] = tx_desc[i].split('\n')[0].replace(' // ', ''); }
  
  let out = ``;
  tx_keys = Object.keys(dict);                      // create keys for functions
  for (let i = 0; i < f.length; i++) {              // for every key in array
    if (tx_keys.includes(f[i])) out += dict[f[i]];  // add function to the shader code
    if (f[i]=='imb') allow_blur[l] = true;          // allow blur for shader if necessary
  }
  
  return out;

}

function mod_uv(str='') {     // modify UV (coordinates) of main image
  
  let f = str.split('-'); 
  let dict = {};
  
  dict["abs"] = ` // [ , ] Absolute (Mirror) Canvas
    uv1 = abs(1.0-abs(1.0-uv1));
    uv1 = abs(1.0-abs(1.0-uv1));
    uv1 = abs(1.0-abs(1.0-uv1));
    uv1 = abs(1.0-abs(1.0-uv1));
    uv1 = abs(1.0-abs(1.0-uv1));
  `;
  
  dict["dps"] = ` // [ , ] Displace Straight [angle,force]
    ti = texture2D(imt_input,uv1);
    tx = kx; 
    ty = ky;
    t1.x = (ti.r*ty) * cos(tx*TWO_PI); 
    t1.y = (ti.b*ty) * sin(tx*TWO_PI); 
    t1.y *= width/height;
    uv1 = uv1+t1*sd;
  `;
  
  dict["dpc"] = ` // [x, ] Displace Curly
    ti = texture2D(imt_input,uv1);
    tx = kx; 
    t1.x = (ti.g*tx) * cos(ti.r*TWO_PI); 
    t1.y = (ti.g*tx) * sin(ti.b*TWO_PI); 
    t1.y *= width/height;
    uv1 = uv1+t1*sd;
  `;  
  
  dict["mod"] = ` // [ , ] Modulo (Repeat) Canvas
    uv1 = mod(uv1,1.0);
  `;
  
  dict["mov"] = ` // [x,y] Move Canvas
    t1.x = kx; 
    t1.y = ky;
    uv1 = uv1 - (t1 - vec2(0.5))*sd;
  `;
  
  dict["pix"] = ` // [w,h] Expand (Pixelate/Mosaic) Pixels
    tx = kx; 
    ty = ky;
    uv1.x = uv1.x - mod(uv1.x, tx * 0.25 );
    uv1.y = uv1.y - mod(uv1.y, ty * 0.25 * width/height);
  `;
  
  dict["rsz"] = ` // [x, ] Resize Canvas
    tx = kx-0.5;
    uv1 = uv1 * (1.0 + tx*3.0*sd);
    uv1 = (uv1+(0.5-(1.0 + tx*3.0)*0.5)*sd);
  `;
  
  dict["sym"] = ` // [t, ] Symmetrical Reflection
    tx = kx;
    if (tx>=0.00 && tx<0.25) uv1.x = uv1.x < 0.5 ? uv1.x : 1.0 - uv1.x;
    if (tx>=0.25 && tx<0.50) uv1.x = uv1.x > 0.5 ? uv1.x : 1.0 - uv1.x;
    if (tx>=0.50 && tx<0.75) uv1.y = uv1.y < 0.5 ? uv1.y : 1.0 - uv1.y;
    if (tx>=0.75 && tx<1.00) uv1.y = uv1.y > 0.5 ? uv1.y : 1.0 - uv1.y;
  `;
  
  dict["wav"] = ` // [x,y] Wave (Sine) Distortion
    tx = kx;
    ty = ky;
    //                       frq                                     spd                    amp
    t1.y = cos( uv1.x * nexto(1.0,tx)*10.0 + time * ceil(nexto(2.0,tx)*10.0-5.0) ) * nexto(3.0,tx)*0.15;
    t1.x = sin( uv1.y * nexto(1.0,ty)*10.0 + time * ceil(nexto(2.0,ty)*10.0-5.0) ) * nexto(3.0,ty)*0.15;
    uv1 = uv1 + vec2(t1.x,t1.y*width/height)*sd;
    t1.y = cos( uv1.x * nexto(4.0,tx)*10.0 + time * ceil(nexto(5.0,tx)*10.0-5.0) ) * nexto(6.0,tx)*0.15;
    t1.x = sin( uv1.y * nexto(4.0,ty)*10.0 + time * ceil(nexto(5.0,ty)*10.0-5.0) ) * nexto(6.0,ty)*0.15;
    uv1 = uv1 + vec2(t1.x,t1.y*width/height)*sd;
    t1.y = cos( uv1.x * nexto(7.0,tx)*10.0 + time * ceil(nexto(8.0,tx)*10.0-5.0) ) * nexto(9.0,tx)*0.15;
    t1.x = sin( uv1.y * nexto(7.0,ty)*10.0 + time * ceil(nexto(8.0,ty)*10.0-5.0) ) * nexto(9.0,ty)*0.15;
    uv1 = uv1 + vec2(t1.x,t1.y*width/height)*sd;
  `;
  
  dict["wa2"] = ` // [x,y] Wave2
    sd*=10.0;
    ` + dict["wav"] + `
    sd/=10.0;
  `;
  
  dict["wtr"] = ` // [x,y] Watercolor Distortion
    // Fork of code by Victor Li http://viclw17.github.io/2018/06/12/GLSL-Practice-With-Shadertoy/
    tx = kx;
    ty = ky;
    tx = tx*2.0+0.01;
    t1 = vec2(nexto(1.0,ty),nexto(2.0,ty));
    t2 = uv1;
    for(int i=1; i<10; i++) {
      t2.x+=0.3/float(i)*sin(float(i)*3.0*t2.y+time*tx)+t1.x;
      t2.y+=0.3/float(i)*cos(float(i)*3.0*t2.x+time*tx)+t1.y;
    }
    tc1.r=cos (t2.x+t2.y+1.0)*0.5+0.5;
    tc1.g=sin (t2.x+t2.y+1.0)*0.5+0.5;
    tc1.b=(sin(t2.x+t2.y)+cos(t2.x+t2.y))*0.5+0.5;
    uv1 = uv1 +(tc1.rb*vec2(2.0)-vec2(1.0))*ty*pow(sd,vec2(1.5,1.5));
  `;
  
  dict["qma"] = ` // [t, ] Quarter Mask
    t10,t20,t30;
    tx = kx;
    t1 = uv1*0.5 + vec2(0.0,0.0);
    t2 = uv1*0.5 + vec2(0.5,0.0);
    t3 = uv1*0.5 + vec2(0.0,0.5);
    t4 = uv1*0.5 + vec2(0.5,0.5);    
    if (tx>=0.00 && tx<0.25 ) { t10=t1; t20=t2; t30=t3; }
    if (tx>=0.25 && tx<0.50 ) { t10=t1; t20=t4; t30=t3; }
    if (tx>=0.50 && tx<0.75 ) { t10=t1; t20=t4; t30=t2; }
    if (tx>=0.70 && tx<1.00 ) { t10=t2; t20=t3; t30=t4; }
    uv1 = mix(t10,t20,smoothstep(0.5,0.5, dot(texture2D(imt_input, t30).rgb,vec3(0.33333)) ));
  `;
  
  dict["qtr"] = ` // [t, ] Quarter Threshold
    t10,t20,t30,t40;
    tx = kx;
    t1 = uv1*0.5 + vec2(0.0,0.0);
    t2 = uv1*0.5 + vec2(0.5,0.0);
    t3 = uv1*0.5 + vec2(0.0,0.5);
    t4 = uv1*0.5 + vec2(0.5,0.5);    
    if (tx>=0.00 && tx<0.25 ) { t10 = t1; t20 = t2; t30 = t3; t40 = t4; }
    if (tx>=0.25 && tx<0.50 ) { t10 = t4; t20 = t3; t30 = t2; t40 = t1; }
    if (tx>=0.50 && tx<0.75 ) { t10 = t2; t20 = t4; t30 = t1; t40 = t3; }
    if (tx>=0.70 && tx<1.00 ) { t10 = t3; t20 = t1; t30 = t4; t40 = t2; }
    uv1 = mix(t10,t20,smoothstep(0.5,0.5, dot(texture2D(imt_input, t20).rgb,vec3(0.33333)) ));
    uv1 = mix(uv1,t30,smoothstep(0.5,0.5, dot(texture2D(imt_input, t30).rgb,vec3(0.33333)) ));
    uv1 = mix(uv1,t40,smoothstep(0.5,0.5, dot(texture2D(imt_input, t40).rgb,vec3(0.33333)) ));
  `;
  
  dict["mrr"] = ` // [x,y] Reflect Pixels
    ti = texture2D(imt_input,uv1);
    ti = ( ti - mod(ti,0.10) ) * ( 1.0/(1.0-0.10) );
    tz = mod(ti.b,0.1)*(10.0) * 6.28 - 3.14;  // rotation
    t1 = uv1;
    t1.y = t1.y * (height/width);  
    tx = ti.r;  // xshift
    ty = ti.g;  // yshift
    t1.x -= tx;
    t1.y -= ty;
    t2.x = c2m(vec2(t1)); 
    t2.y = c2d(vec2(t1)); 
    uv1.x = r2x(vec2( t2.x, t2.y + tz*sd.x ) ) + tx;
    uv1.y = r2y(vec2( t2.x, t2.y + tz*sd.y ) ) + ty;
    uv1.y = uv1.y * (width/height);  
  `;
  
  dict["brl"] = ` // [x, ] Barrel Distortion
    tx = kx;
    uv1.y = uv1.y * (height/width);  
    uv1 -= 0.5;
    t2.x = c2m(vec2(uv1)); 
    t2.y = c2d(vec2(uv1)); 
    t2.x += tx-0.5;
    uv1.x = r2x(vec2( t2.x, t2.y ) ) + 0.5;
    uv1.y = r2y(vec2( t2.x, t2.y ) ) + 0.5;
    uv1.y = uv1.y * (width/height);  
  `;
  
  dict["slx"] = ` // [x,s] Slit X
    tx = kx;    ty = ky;    ty *= 0.1;
    uv1.x = tx + mod(uv1.x-ty*0.5,ty);  
  `;
  
  dict["sly"] = ` // [s,y] Slit Y
    tx = kx;    ty = ky;    tx *= 0.1;
    uv1.y = ty + mod(uv1.y-tx*0.5,tx);  
  `;
  
  dict["sdx"] = ` // [x,s] Dynamic Slit X
    tx = kx;    ty = ky;    ty *= 0.1;
    uv1.x = tx + mod(uv1.x-ty*0.5,ty) + uv1.x*sin(time)*0.2;  
  `;
  
  dict["sdy"] = ` // [s,y] Dynamic Slit Y
    tx = kx;    ty = ky;    tx *= 0.1;
    uv1.y = ty + mod(uv1.y-tx*0.5,tx) + uv1.y*sin(time)*0.2;   
  `;
  
  // --------------------------------------
  
  uv_desc = Object.values(dict);
  for (let i = 0; i < uv_desc.length; i++) { uv_desc[i] = uv_desc[i].split('\n')[0].replace(' // ', ''); }

  let out = ``;
  uv_keys = Object.keys(dict);
  for (let i = f.length-1; i >= 0; i--) {   // reading keys backward because of UV distortions sequence
    f[i] = f[i].split('(');                 // separate control values
    out += '\n' + set_xy(f[i][1]);          // set control values
    if (uv_keys.includes(f[i][0])) out += ` ` + dict[f[i][0]];  // add functions by keys
    out += '\n';
    out += '  ' + `nxy += 1.0;` + '\n';                               // increase control values step
    out += '  ' + `kx = nexto(nxy,kx); ky = nexto(nxy,ky); ` + '\n';  // randomize control values for the step
  }

  return out;
  
}

function mod_cl(str='') {     // modify RGB (color) of main image

  let f = str.split('-'); 
  let dict = {};

  dict["gry"] = ` // [ , ] Gray (Average) Color
    img1.rgb = vec3(dot(img1.rgb, vec3(0.33333)));
  `;

  dict["bwc"] = ` // [ , ] BW (Calculated) Color
    img1.rgb = vec3(dot(img1.rgb, vec3(0.2126,0.7152,0.0722)));
  `;

  dict["rpc"] = ` // [i,o] Replace Color
    tx = kx;
    ty = ky;
    tc1 = vec3(nexto(1.0,tx),nexto(2.0,tx),nexto(3.0,tx)); // input color
    tc2 = vec3(nexto(1.0,ty),nexto(2.0,ty),nexto(3.0,ty)); // output color
    tz = 1.0-distance(img1.rgb,tc1);
    img1.rgb = mix(img1.rgb,tc2,tz);
  `;

  dict["rpi"] = ` // [i,o] Replace Ink
    tx = kx;
    ty = ky;
    tc1 = texture2D(`+txm+`,vec2(tx,ty)).rgb;              // input color
    tc2 = vec3(nexto(1.0,ty),nexto(2.0,ty),nexto(3.0,ty)); // output color
    tz = 1.0-distance(img1.rgb,tc1);
    img1.rgb = mix(img1.rgb,tc2,tz);
  `;
  
  dict["swc"] = ` // [i,o] Swap Color
    tx = kx;
    ty = ky;
    tc1 = vec3(nexto(1.0,tx),nexto(2.0,tx),nexto(3.0,tx)); // input color
    tc2 = vec3(nexto(1.0,ty),nexto(2.0,ty),nexto(3.0,ty)); // output color
    tz = 1.0-distance(img1.rgb,tc1);
    ti.rgb = mix(img1.rgb,tc2,tz);
    tz = 1.0-distance(img1.rgb,tc2);
    img1.rgb = mix(ti.rgb,tc1,tz);
  `;
  
  dict["swi"] = ` // [i,o] Swap Ink
    tx = kx;
    ty = ky;
    tc1 = texture2D(`+txm+`,vec2(tx,ty)).rgb;                       // input color
    tc2 = texture2D(`+txm+`,vec2(nexto(1.0,tx),nexto(1.0,ty))).rgb; // output color
    tz = 1.0-distance(img1.rgb,tc1);
    ti.rgb = mix(img1.rgb,tc2,tz);
    tz = 1.0-distance(img1.rgb,tc2);
    img1.rgb = mix(ti.rgb,tc1,tz);
  `;
  

  dict["edg"] = ` // [ , ] Detect Edges
    tx = 1.0/width ;
    ty = 1.0/height;
    tz = 
        abs(dot(texture2D(`+txm+`, vec2 (uv1.x-tx, uv1.y)).rgb,vec3(0.33333)) - 
            dot(texture2D(`+txm+`, vec2 (uv1.x+tx, uv1.y)).rgb,vec3(0.33333)))+
        abs(dot(texture2D(`+txm+`, vec2 (uv1.x, uv1.y-ty)).rgb,vec3(0.33333)) - 
            dot(texture2D(`+txm+`, vec2 (uv1.x, uv1.y+ty)).rgb,vec3(0.33333)));
    img1.rgb = mix(vec3(0.0),img1.rgb,tz);
  `;
  
  dict["ebr"] = ` // [x,t] Enhance Brightness
    tx = kx;
    ty = ky;
    img1.rgb = dot(img1.rgb, vec3(0.33333)) > ty ? img1.rgb*(1.0+tx*3.0) : img1.rgb;
    img1 = clamp(img1,0.0,1.0);
  `;
  
  dict["edr"] = ` // [x,t] Enhance Darkness
    tx = kx;
    ty = ky;
    img1.rgb = dot(img1.rgb, vec3(0.33333)) < ty ? img1.rgb-tx : img1.rgb;
    img1 = clamp(img1,0.0,1.0);
  `;

  dict["hue"] = ` // [x, ] Hue Shift
    tx = kx;
    img1.rgb = rgb2hsb(img1.rgb);
    img1.r = img1.r+tx;
    img1.rgb = hsb2rgb (img1.rgb);
  `;

  dict["hud"] = ` // [ , ] Show some HUD
    //img1.rgb = (uv1.x>-0.1) && (uv1.x<0.1) && (uv1.y>-0.1) && (uv1.y<0.1) ? vec3(1.0,0.0,0.0) : img1.rgb;
    img1.rgb = length(uv0    )<0.05 ? vec3(1.0,0.0,0.0) : img1.rgb;
    img1.rgb = length(uv1    )<0.05 ? vec3(0.0,1.0,0.0) : img1.rgb;
    img1.rgb = length(1.0-uv1)<0.05 ? vec3(0.0,0.0,1.0) : img1.rgb;
    float l1 = length(uv0+uv1)*0.5;
    float l2 = length(uv1-uv0)*0.5;
    img1.rgb = l1>l2-0.01 && l1<l2+0.01? vec3(1.0,1.0,0.0) : img1.rgb;
    img1.rgb = abs(uv1.x)<0.005 || abs(uv1.y)<0.005 ? vec3(0.0,1.0,1.0) : img1.rgb;
  `;

  dict["neg"] = ` // [ , ] Negative Colors
    img1.rgb = vec3(1.0)-img1.rgb;
  `;

  dict["pst"] = ` // [x, ] Posterize Colors
    tx = kx;
    tx = 2.0+tx*4.0;
    img1.rgb = floor(img1.rgb*vec3(tx))/vec3(tx)*vec3(1.0/(1.0-1.0/tx));
  `;

  dict["thr"] = ` // [l, ] Threshold Color
    tx = kx;
    img1.rgb = dot(img1.rgb, vec3(0.33333)) < tx ? vec3(0.0) : vec3(1.0);
  `;

  dict["blc"] = ` // [ , ] Canvas Black
    img1.rgb = (uv1.x>1.0) || (uv1.x<0.0) || (uv1.y>1.0) || (uv1.y<0.0) ? vec3(0.0) : img1.rgb;
  `;
  
  dict["mdc"] = ` // [x, ] Modulo Color
    tx = kx;
    img1.rgb *= mod(dot(img1.rgb, vec3(0.33333)),tx)*vec3(1.0/tx);
  `;
  
  dict["mdr"] = ` // [x, ] Modulo RGB
    tx = kx;
    img1.rgb *= mod(img1.rgb,tx)*vec3(1.0/tx);
  `;

  dict[""] = `
  `;
  
  cl_desc = Object.values(dict);
  for (let i = 0; i < cl_desc.length; i++) { cl_desc[i] = cl_desc[i].split('\n')[0].replace(' // ', ''); }
  
  let out = ``;
  cl_keys = Object.keys(dict);
  for (let i = 0; i < f.length; i++) { 
    f[i] = f[i].split('(');
    out += '\n' + set_xy(f[i][1]);
    if (cl_keys.includes(f[i][0])) out += ` ` + dict[f[i][0]];  
    out += '\n';
    out += '  ' + `nxy += 1.0;` + '\n';
    out += '  ' + `kx = nexto(nxy,kx); ky = nexto(nxy,ky); ` + '\n';
  }
  
  return out;

}

function mod_al(str='') {     // modify Alpha (transparency) of main image
  
  let f = str.split('-'); 
  let dict = {};
  
  dict["sft"] = ` // [x, ] Alpha Soft
    tx = kx*0.1;
    asoft = tx;
  `;
  
  dict["gry"] = ` // [ , ] Alpha Gray
    img1.a *= dot(img1.rgb, vec3(0.33333));
  `;
    
  dict["thr"] = ` // [l, ] Alpha Threshold
    tx = kx;
    img1.a *= smoothstep( tx-asoft, tx+asoft, dot(img1.rgb, vec3(0.33333)) );
  `;
      
  dict["ths"] = ` // [x,y] Alpha Threshold Slit
    tx = kx;
    ty = 0.3*ky;
    img1.a *= clamp(
              smoothstep( tx-ty-asoft, tx-ty+asoft, dot(img1.rgb, vec3(0.33333)) ) 
            - smoothstep( tx+ty-asoft, tx+ty+asoft, dot(img1.rgb, vec3(0.33333)) )
              ,0.0,1.0);
  `;
  
  dict["grm"] = ` // [x, ] Alpha Gray Modulo
    tx = kx;
    img1.a *= mod(dot(img1.rgb, vec3(0.33333)),tx)*(1.0/tx);
  `;
  
  dict["frm"] = ` // [x,y] Alpha Frame
    tx = kx*0.5;
    ty = kx*0.5+ky*0.5;    
    img1.a *= clamp(
      clamp( (smoothstep(tx-asoft,tx+asoft,uv1.x) - smoothstep(1.0-tx-asoft,1.0-tx+asoft,uv1.x))
           + (smoothstep(tx-asoft,tx+asoft,uv1.y) - smoothstep(1.0-tx-asoft,1.0-tx+asoft,uv1.y)) - 1.0,  0.0,1.0) -
      clamp( (smoothstep(ty-asoft,ty+asoft,uv1.x) - smoothstep(1.0-ty-asoft,1.0-ty+asoft,uv1.x))
           + (smoothstep(ty-asoft,ty+asoft,uv1.y) - smoothstep(1.0-ty-asoft,1.0-ty+asoft,uv1.y)) - 1.0,  0.0,1.0) 
              ,0.0,1.0);
  `;
  
  dict["crc"] = ` // [x,y] Alpha Circle
    tx = ky*0.5;
    ty = kx*tx;
    t1 = uv1 - vec2(0.5);
    t1.y /= width/height;    
    img1.a *= clamp(
              smoothstep( pow(tx,2.0) , pow(clamp(tx-asoft,0.0,1.0),2.0), t1.x*t1.x+t1.y*t1.y ) 
            - smoothstep( pow(ty,2.0) , pow(clamp(ty-asoft,0.0,1.0),2.0), t1.x*t1.x+t1.y*t1.y )
              ,0.0,1.0);
  `;
  
  dict["slx"] = ` // [x,y] Alpha Slit X
    tx = kx; ty = ky*0.5;
    img1.a *= clamp(
              smoothstep(tx-ty-asoft,tx-ty+asoft,uv1.x)
            - smoothstep(tx+ty-asoft,tx+ty+asoft,uv1.x)
              ,0.0,1.0);
  `;
  
  dict["sly"] = ` // [x,y] Alpha Slit Y
    tx = kx*0.5; ty = ky;
    img1.a *= clamp(
              smoothstep(ty-tx-asoft,ty-tx+asoft,uv1.y)
            - smoothstep(ty+tx-asoft,ty+tx+asoft,uv1.y)
              ,0.0,1.0);
  `;

  dict["slr"] = ` // [x,y] Alpha Slit Rotation
    tx = kx;
    ty = ky;
    td = 0.1;                               
    ts = clamp(td - asoft,0.0,1.0);
    img1.a *= clamp( abs(     //    x                         y                      r
      smoothstep( tx+ts*sin(ty*PI-PI/2.0)   +(uv1.y-   (ty+ts*sin(ty*PI))   )    *tan(ty*PI)   , 
                  tx+td*sin(ty*PI-PI/2.0)   +(uv1.y-   (ty+td*sin(ty*PI))   )    *tan(ty*PI)   ,  uv1.x )  - 
      smoothstep( tx+td*sin(ty*PI+PI/2.0)   +(uv1.y-   (ty-td*sin(ty*PI))   )    *tan(ty*PI)   , 
                  tx+ts*sin(ty*PI+PI/2.0)   +(uv1.y-   (ty-ts*sin(ty*PI))   )    *tan(ty*PI)   ,  uv1.x )  )
              ,0.0,1.0);
  `;
    
  dict["trc"] = ` // [ , ] Canvas Transparent
    img1.a *= clamp(
              (smoothstep(0.0,asoft,uv1.x) - smoothstep(1.0-asoft,1.0,uv1.x))
            + (smoothstep(0.0,asoft,uv1.y) - smoothstep(1.0-asoft,1.0,uv1.y)) - 1.0
              ,0.0,1.0);
  `;
  
  dict["blc"] = ` // [x, ] Alpha Black Cutoff
    tx = kx;
    img1.a *= smoothstep(tx-asoft,tx+asoft,dot(img1.rgb, vec3(0.33333))) ;
  `;
  
  dict["whc"] = ` // [x, ] Alpha White Cutoff
    tx = kx;
    img1.a *= 1.0-smoothstep(1.0-tx-asoft,1.0-tx+asoft,dot(img1.rgb, vec3(0.33333))) ;
  `;
  
  dict["neg"] = ` // [ , ] Alpha Negative
    img1.a = 1.0 - img1.a;
  `;

  dict["avs"] = ` // [ , ] Alpha Visible
    img1.rgb = vec3(img1.a);
    img1.a = 1.0;
  `;

  dict[""] = `
  `;
  
  al_desc = Object.values(dict);
  for (let i = 0; i < al_desc.length; i++) { al_desc[i] = al_desc[i].split('\n')[0].replace(' // ', ''); }

  let out = ``;
  al_keys = Object.keys(dict);
  for (let i = 0; i < f.length; i++) { 
    f[i] = f[i].split('(');
    out += '\n' + set_xy(f[i][1]);
    if (al_keys.includes(f[i][0])) out += ` ` + dict[f[i][0]];  
    out += '\n';
    out += '  ' + `nxy += 1.0;` + '\n';
    out += '  ' + `kx = nexto(nxy,kx); ky = nexto(nxy,ky); ` + '\n';
  }
  
  return out;
  
}

function sel_bl(str='') {     // select blending for main and background images
  
  let f = str.split('-'); 
  let dict = {};
  
  dict["nml"] = ` // [ , ] Normal
    m = b;
  `;
  
  dict["lgt"] = ` // [ , ] Lighten
    m = max(a,b);
  `;
  
  dict["drk"] = ` // [ , ] Darken
    m = min(a,b);
  `;
  
  dict["scr"] = ` // [ , ] Screen
    m = 1.0-(1.0-a)*(1.0-b);
  `;
  
  dict["mtp"] = ` // [ , ] Multiply
    m = a*b;
  `;
  
  dict["cld"] = ` // [ , ] Color Dodge
    m = b/(1.0-a);  
  `;
  
  dict["clb"] = ` // [ , ] Color Burn
    m = 1.0-(1.0-b)/a;
  `;
  
  dict["lnd"] = ` // [ , ] Linear Dodge
    m = a+b;
  `;
  
  dict["lnb"] = ` // [ , ] Linear Burn
    m = a+b-1.0;
  `;
  
  dict["sbt"] = ` // [ , ] Subtract
    m = b-a;
  `;
  
  dict["dfr"] = ` // [ , ] Difference
    m = abs(a-b);
  `;

  dict["exc"] = ` // [ , ] Exclusion
    m = 0.5 - 2.0*(b-0.5)*(a-0.5);
  `;

  dict["ovr"] = ` // [ , ] Overlay
    m = (bc <= 0.5) ? (2.0*a*b) : (1.0-2.0*(1.0-a)*(1.0-b));
  `;

  dict["hdl"] = ` // [ , ] Hard Light
    m = (ac <= 0.5) ? (2.0*a*b) : (1.0-2.0*(1.0-a)*(1.0-b));
  `;

  dict["sfl"] = ` // [ , ] Soft Light
    m = (ac <= 0.5) ? ((2.0*a-1.0)*(b-b*b)+b) : ((2.0*a-1.0)*(sqrt(b)-b)+b);
  `;

  dict["vvl"] = ` // [ , ] Vivid Light
    m = (ac <= 0.5) ? (1.0-(1.0-b)/(2.0*a)) : (b/(2.0*(1.0-a)));
  `;

  dict["lnl"] = ` // [ , ] Linear Light
    m = b+2.0*a-1.0;
  `;

  dict["pnl"] = ` // [ , ] Pin Light
    m = (bc < 2.0*ac*1.0) ? (2.0*a-1.0) : (bc < 2.0*ac) ? (b) : (2.0*a);
  `;

  dict["hmx"] = ` // [ , ] Hard Mix
    m = (ac < 1.0-bc) ? vec4(0.0,0.0,0.0,b.a) : vec4(1.0,1.0,1.0,b.a);
  `;

  dict["thl"] = ` // [ , ] Threshold Lighten
    m = (smoothstep(0.48,0.52,bc) > 0.5) ? b : a;
  `;

  dict["thd"] = ` // [ , ] Threshold Darken
    m = (smoothstep(0.48,0.52,bc) < 0.5) ? b : a;
  `;

  dict["hue"] = ` // [ , ] Hue
    m.rgb = hsb2rgb(vec3(bh.r,ah.g,ah.b));
  `;

  dict["sat"] = ` // [ , ] Saturation
    m.rgb = hsb2rgb(vec3(ah.r,bh.g,ah.b));
  `;

  dict["clr"] = ` // [ , ] Color
    m.rgb = hsb2rgb(vec3(bh.r,bh.g,ah.b));
  `;

  dict["lum"] = ` // [ , ] Luminosity 
    m.rgb = hsb2rgb(vec3(ah.r,ah.g,bh.b));
  `;

  dict["lon"] = ` // [ , ] Lighten Only
    m.rgb = vec3(max(a.r,b.r),max(a.g,b.g),max(a.b,b.b));
  `;

  dict["don"] = ` // [ , ] Darken Only
    m.rgb = vec3(min(a.r,b.r),min(a.g,b.g),min(a.b,b.b));
  `;
  
  dict["bin"] = ` // [x, ] Blend Input
    kx = smoothstep(kx-csoft,kx+csoft,ac);
  `;
  
  dict["bou"] = ` // [x, ] Blend Output
    kx = smoothstep(kx-csoft,kx+csoft,bc);
  `;
  
  dict["bir"] = ` // [x, ] Blend Input Reversed
    kx = smoothstep(kx-csoft,kx+csoft,1.0-ac);
  `;
  
  dict["bor"] = ` // [x, ] Blend Output Reversed
    kx = smoothstep(kx-csoft,kx+csoft,1.0-bc);
  `;
  
  dict["bi2"] = ` // [x, ] Blend Input v2
    kx = smoothstep(kx-csoft,kx+csoft,1.0-ac) - smoothstep(0.99-csoft,0.99+csoft,1.0-ac);
  `;
  
  bl_desc = Object.values(dict);
  for (let i = 0; i < bl_desc.length; i++) { bl_desc[i] = bl_desc[i].split('\n')[0].replace(' // ', ''); }

  let out = ``;
  bl_keys = Object.keys(dict);
  for (let i = 0; i < f.length; i++) { 
    f[i] = f[i].split('(');
    out += '\n' + set_xy(f[i][1]);
    if (bl_keys.includes(f[i][0])) out += ` ` + dict[f[i][0]];  
  }
  
  return out;
  
}

// -------------------------------------- 

function shx_main(str='') {   // main code of shader

let f = str.split(':'); 
txm = f[0]!='' ? f[0] + '_input' : 'imt_input';
txb = f[5]!='' ? f[5] + '_input' : 'imt_input';

return `

precision mediump float; 
varying vec2 vTexCoord;
#define     PI 3.14159265359 
#define TWO_PI 6.28318530718
uniform sampler2D imi_input,imt_input,imo_input,imb_input;
uniform float Ra, Rb, Rc, time, width, height, quality, kFPS;
uniform float x1,x2,x3,y1,y2,y3,a1,a2,a3,b1,b2,b3,c1,c2,c3,r1,r2,r3;
vec2 uv0, uv1;
vec4 img0, img1, img_out;

float c2m(vec2 c) {
  return sqrt(pow(c.x,2.0) + pow(c.y,2.0));
}

float c2d(vec2 c) {
  return atan(c.y,c.x);
}

float r2x(vec2 r) {
  return r.x * cos(r.y);
}

float r2y(vec2 r) {
  return r.x * sin(r.y);
}

vec3  hsb2rgb(vec3 c) {
  // Color conversion function from Sam Hocevar: 
  // lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
  vec4 K = vec4(1.0,2.0/3.0,1.0/3.0,3.0);
  vec3 p = abs(fract(c.xxx+K.xyz)*6.0-K.www);
  return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);
}

vec3  rgb2hsb(vec3 c) {
  // Color conversion function from Sam Hocevar: 
  // lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
  vec4 K = vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
  vec4 p = c.g<c.b?vec4(c.bg,K.wz):vec4(c.gb,K.xy);
  vec4 q = c.r<p.x?vec4(p.xyw,c.r):vec4(c.r,p.yzx);
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z+(q.w-q.y)/ 
  (6.0*d+e)), d/(q.x+e), q.x);
}

float nexto2(float ch, float n) {
  float x = n;
  float a = sin(x)*cos(x);
  a = fract(a);
  return a;
}

float nexto(float ch, float n) {
  float a;
  a = sin(n*ch);  a = floor(a*10000.0)*0.001;
  a = cos(a);     a = floor(a*8000.0)*0.001;
  return fract(a);
}

// --------------------------------------

void main() {

  uv1 = uv0  = vec2(vTexCoord.x, 1.0-vTexCoord.y);
  
  float kx = 0.5; 
  float ky = 0.5;
  
  float tx, ty, tz, td, ts;
  vec2 t1,t2,t3,t4,t10,t20,t30,t40;
  vec3 tc1,tc2;
  vec4 ti;
  
  float csoft = 0.05;
  float asoft = 0.00;
  float nxy = 0.0;
  float t = time/TWO_PI;
  float p = abs(0.5-t)*2.0;
  
  vec2 sd = `+ (txm=='imo_input' ? `vec2(0.05,0.05*width/height);` + (frameskip ? `sd *= kFPS;` : ``) : `vec2(1.0);`) +`
  
  //// 00: uv corrections
  `+mod_uv(f[1])+`

  //// 01: main image creation 
  img1 = texture2D(imt_input, uv1);
  `+sel_tx(1,f[0])+`

  //// 02: color corrections
  `+mod_cl(f[2])+`
  
  //// 03: alpha corrections
  `+mod_al(f[3])+`
  
  //// 04: background loading
  img0 = texture2D(imt_input, uv0);
  `+sel_tx(0,f[5])+`

  //// 05: mixing main with background
  vec4 a = img0;
  vec4 b = img1;
  vec4 m = b;
  kx = 1.00;
  float ac = dot(a.rgb, vec3(0.33333));
  float bc = dot(b.rgb, vec3(0.33333));
  vec3 ah = rgb2hsb( a.rgb );
  vec3 bh = rgb2hsb( b.rgb );
  `+sel_bl(f[4])+`
  m.a = b.a;
  img_out = mix(a,m,kx);

  gl_FragColor = img_out;

  }
  
`;}

return shx_main(str);
  
}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////

function preload() {       // preload external image if acceptable
  if (image_url!="") cam_input = loadImage(image_url, callback);
}

function callback() {      // get camera frame dimensions if acceptable
  CamW = cam_input.width ;
  CamH = cam_input.height;
}

function setup() {         // setup basic values

  settings_load();
  
  if (mobile) {            // open the 'multiple files download' permit in browser
    save('','?.txt');      // try to download two fake files at once to open dialogue
    save('','?.txt');
  }

  pixelDensity(1.0);                 // fix the density for all devices
  quality = quality/pixelDensity();  // decrease quality if density is high
  WinW = window.innerWidth -4;       // window size (with html fix)
  WinH = window.innerHeight-4;       // window size (with html fix)
  createCanvas(WinW, WinH);          // put sketch in a browser window
  
  background(100);
  load_step = 0;
  frame = 'L1';
  focus = null;
  text_line = 0;
  bt = [0,0,0]; // beat speed, beat0, beat1;
  btsv = [0,0,0];
  textFont('monospace');
  horient = false;
  queue = 0;
  filter_temp = '';
  
  playing = [true,true,true];  // time mode (=/~), playing mode (play/stop), last state of playing mode for burst
  
  fr = 0; // frame rate
  to_play = false;
  to_save = false;
  asave = [];
  avals = [];
  vis = true;
  
  //print(glsl_frags.length);

}

function setup_screen() {  // setup values according to camera frame dimensions
  
  //frameRate(6);
  
  // Transformation coefficient to fit vertical/horizontal camera window into sketch:
  CamK = (WinH/WinW >= CamH/CamW) ? WinW/CamW : WinH/CamH;   
  
  // Linking main image size to the camera size:
  width  = CamW*quality;
  height = CamH*quality;
  
  // Set displayed image size and position:
  VidW = CamW*CamK;  VidX = (WinW-VidW)*0.5;
  VidH = CamH*CamK;  VidY = (WinH-VidH)*0.5;
  
  // Set interface size
  IntH = WinH;    IntW = min(WinW,WinH);
  IntY = 0;       IntX = (WinW-IntW)*0.5;
  bx = IntW/10;   
  by = IntH/10;

  // Create main processing image:
  imgX = createGraphics(width, height, WEBGL);
  
  // Create an array of shaders
  shd = [];

  // Rebuild all shaders with new code
  shader_update(filter);

  stackImg = createGraphics(width, height);               // create flattered processed image
  tinyImg  = createGraphics(width*0.025, height*0.025);   // create small image for blur effect

  //stackImg.image(cam_input,0,0,stackImg.width, stackImg.height); // preload cam image for feedback effects

  // Create DOM input
  filter_input = createElement('textarea', filter_name+'@'+filter);
  filter_input.position(IntX+by,-10000).size(IntW-by*3.2,by*0.85);
  filter_input.style('font-size', by/3+'px');
  filter_input.style('font-family', 'monospace');
  filter_input.style('color', 'white');
  filter_input.style('background-color', 'black');
  filter_input.style('text-align', 'center');
  filter_input.style('overflow-wrap', 'anywhere');
  
  file_input = createFileInput(filter_import);
  file_input.position(IntX+by,-10000);
  file_input.style('font-size', by/3+'px');
  file_input.style('font-family', 'monospace');
  file_input.style('color', 'white');
  file_input.style('background-color', 'black');
  file_input.style('text-align', 'center');
  
}

function draw() {          // main loading sequence

  // Load the camera
  if (load_step==0) {      
    if (image_url=="") {
      let fmode;
      if (frontal) fMode = "user";
      else fMode = "environment";
      let camera_width  = vgamode ? {ideal: 640} : {ideal: 10000};
      let camera_height = vgamode ? {ideal: 480} : {ideal: 10000};
      let camera_settings = {
        audio: false,
        video: { 
          width:  camera_width,
          height: camera_height,
          facingMode: fMode 
        }
      };	
      cam_input = createCapture(camera_settings, callback);  
      cam_input.hide();
    }
    load_step = 1; 
  }

  // Setup values
  if (load_step==1 && ((image_url == "" && cam_input.loadedmetadata) || image_url != "")) {  
    setup_screen();
    load_step = 2;
  }

  // Draw a frame
  if (load_step==2) {      
    draw_frame();
  }

}

//////////////////////////////////////////

function draw_frame() {    // draw a frame

  kFPS = 60/frameRate();   // acceleration for dynamic effects on low FPS
  time = millis()/3000;    // speed of time
  
  if (mouseIsPressed) mc++;  
  else mc = 0;
  
  if (beat(500)) fr = frameRate().toFixed(2); 
  
  background(0);
  noSmooth();
  
  if (to_play) {
    processing();
  }
  
  saving();

  // Frames
  
  // 00: Pure
  
  if (frame=='L0') {
    
    btn_play = new sb(IntX,IntY,IntW,IntH/2); 
    btn_save = new sb(IntX,IntH/2,IntW,IntH/2-by); 
    btn_hide = new sb(IntX,IntH-by,IntW,by);               btn_hide.txt[0] = 'show';
    
    frame = 0;
    
  }
  
  if (frame <= 1) {
  
    if (vis) image(stackImg,VidX,IntY,VidW,VidH);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);
    textSize(by); textAlign(RIGHT,TOP); fill(0,192);
    text(queue,IntX+IntW-by*1.2,IntY+by*1.2); noFill();
    
    if (beat(500)) settings_save();    
  
    btn_play.show();
      if (frame == 1) btn_play.h = (IntH/2-by) * ( pmd==3 ? 2.0 : 1.0 );
      if (frame == 0) btn_play.h = pmd==3 ? IntH-by : IntH/2;
      btn_play.txt[1] = fr;
      if (pmd == 0) {
        btn_play.txt[4] = to_play ? "stop" : "play";
        if (btn_play.clicked) to_play = !to_play;  
        btn_save.hide = false;
      }
      if (pmd == 1) {
        to_play = false;
        btn_play.txt[4] = ">>";
        if (btn_play.pressed) processing();  
        btn_save.hide = false;
      }
      if (pmd == 2) {
        to_play = false;
        btn_play.txt[4] = ">";
        if (btn_play.clicked) processing();  
        btn_save.hide = false;
      }
      if (pmd == 3) {
        to_play = false;
        btn_save.hide = true;
        btn_play.txt[4] = "> save";
        if (btn_play.clicked) {
          processing();  
          to_save = true;
        }
      }
      
    btn_save.show();
      btn_save.txt = ['','','','save',width*pixelDensity()+'x'+height*pixelDensity()];
      if (btn_save.clicked) to_save = true;  
      
    btn_hide.show();
      if (btn_hide.clicked)
        frame = frame == 1 ? 'L0' : 'L1';  
      
  }

  // 01: Main Frame
  
  if (frame=='L1') {
  
    btn_edit = new sb(IntX+by,0,IntW-by*2,by); 
    btn_play = new sb(IntX+by,IntY+by,IntW-by*2,IntH/2-by); 
    btn_save = new sb(IntX+by,IntH/2 ,IntW-by*2,IntH/2-by); 
    btn_hide = new sb(IntX+by,IntH-by,IntW-by*2,by);               btn_hide.txt[0] = 'hide';
    
    btn_s    = new sb(IntX,IntY+by*0,by,by*2); 
    btn_m = [];
    btn_m[1] = new sb(IntX,IntY+by*2,by,by*2); 
    btn_m[2] = new sb(IntX,IntY+by*4,by,by*2); 
    btn_m[3] = new sb(IntX,IntY+by*6,by,by*2); 
    btn_r    = new sb(IntX,IntY+by*8,by,by*2); 
    
    btn_p    = new sb(IntX+IntW-by,IntY+by*0,by,by*2); 
    btn_a    = new sb(IntX+IntW-by,IntY+by*2,by,by*2); 
    btn_b    = new sb(IntX+IntW-by,IntY+by*4,by,by*2); 
    btn_c    = new sb(IntX+IntW-by,IntY+by*6,by,by*2); 
    btn_v    = new sb(IntX+IntW-by,IntY+by*8,by,by*2); 
    
    focus = null;
    frame = 1;
    
  }
  
  if (frame==1) {
    
    btn_edit.show();
      btn_edit.txt[0] = filter_name;
      if (btn_edit.clicked) {
        filter_temp = filter;
        frame = 'L4';
      }
    
    btn_p.show();
      btn_p.txt[1] = 'P';
      if (btn_p.clicked) { 
        pmd ++;
        if (pmd>3) pmd = 0;
      }
    
    btn_a.show();
      btn_a.txt[1] = 'A';
      btn_a.holdtime = 200;
      btn_a.txt[4] = a[1]+'\n'+a[2]+'\n'+a[3];
      if (btn_a.clicked || (btn_a.hold && beat(500))) 
        a = [1.0,Math.random().toFixed(2),Math.random().toFixed(2),Math.random().toFixed(2)];
    
    btn_b.show();
      btn_b.txt[1] = 'B';
      btn_b.holdtime = 200;
      btn_b.txt[4] = b[1]+'\n'+b[2]+'\n'+b[3];
      if (btn_b.clicked || (btn_b.hold && beat(500))) 
        b = [1.0,Math.random().toFixed(2),Math.random().toFixed(2),Math.random().toFixed(2)];

    btn_c.show();
      btn_c.txt[1] = 'C';
      btn_c.holdtime = 200;
      btn_c.txt[4] = c[1]+'\n'+c[2]+'\n'+c[3];
      if (btn_c.clicked || (btn_c.hold && beat(500))) 
        c = [1.0,Math.random().toFixed(2),Math.random().toFixed(2),Math.random().toFixed(2)];
      
    btn_r.show();
      btn_r.size = min(bx,by)/2;
      btn_r.txt[1] = horient ? '→' : '↑';
      if (btn_r.clicked) { 
        horient = !horient;
      }
      
    btn_v.show();
      btn_v.txt[1] = 'V';
      if (btn_v.clicked) { 
        vis = !vis;
      }
      
      // -----------------------
      
    btn_s.show();
      btn_s.txt[1] = 'S';
      if (btn_s.clicked) { 
        frame = 'L3';
      }
      
    for (let i=1; i<=3; i++) {
      btn_m[i].show();
      btn_m[i].txt[1] = i;
      btn_m[i].txt[4] = x[i]+'\n'+y[i];
      if (btn_m[i].clicked) {
        frame = 'L2';
        focus = i;
      }
    }
    
  }
  
  // 02: Set XY
  
  if (frame=='L2') { 
  
    btn_x = new sb(IntX+IntW-by,0,by,by); 
    btn_x.txt[0] = '✖';
    frame = 2;
    
  }
  
  if (frame==2) {
    
    image(stackImg,VidX,VidY,VidW,VidH);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);
    
    if (mousedragged && ((pmouseX-mouseX)**2+(pmouseY-mouseY)**2>5**2)) {
      processing();
      x[focus] = constrain(map(mouseX,IntX,IntX+IntW,0,1),0,1).toFixed(2);
      y[focus] = constrain(map(mouseY,IntY,IntY+IntH,0,1),0,1).toFixed(2);
    }
    
    to_play = true;
    stroke(255); noFill();
    let mx = IntX+x[focus]*IntW;
    let my = IntY+y[focus]*IntH;
    let sx = mx<IntX+IntW-200?0:-173;
    let sy = my>65?0:65;
    line(mx,IntY,mx,IntY+IntH);
    line(IntX,my,IntX+IntW,my);
    noStroke(); fill(0,192);
    rect(mx+10+sx,my-10+sy,185,-45);
    fill(255); textSize(30);
    textAlign(LEFT, CENTER);
    text(x[focus]+", "+y[focus], mx+20+sx,my-30+sy);
    textAlign(LEFT, TOP);
    text(focus, IntX+5,IntY+5);

    btn_x.show();
      if (btn_x.clicked) {
        frame = 'L1';
      }
      
  }
  
  // 03: Settings
  
  if (frame=='L3') { 
  
    btn_n = new sb(IntX,0,IntW-by*2,by);        btn_n.txt[0] = 'Settings';    btn_n.clickable = false;
    btn_x = new sb(IntX+IntW-by,0,by,by);       btn_x.txt[0] = '✖';
    btn_o = new sb(IntX+IntW-by*2,0,by,by);     btn_o.txt[0] = '✓';
    
    btn_s = [];
    for (let i=1; i<=5; i++) {
      btn_s[i] = new sb(IntX+bx,by*0.5+by*i,bx*8,by);
    }
    
    settings_save();
    
    to_play = false;
    frame = 3;
    
  }
  
  if (frame==3) {
    
    background(50);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);

    btn_n.show(); 
    
    btn_x.show(); 
      if (btn_x.clicked) {
        settings_load();
        frame = 'L1';
      }
      
    btn_o.show(); 
      if (btn_o.clicked) {
        settings_save();
        setup();
      }
      
    let i = 0;
      
    i++;
    btn_s[i].show();
      btn_s[i].txt[0] = 'VGA mode: '+ (vgamode ? 'ON' : 'OFF');
      if (btn_s[i].clicked) {
        vgamode = !vgamode;
      }
      
    i++;
    btn_s[i].show();
      btn_s[i].txt[0] = 'Quality: '+nfs(quality,1,1);
      if (btn_s[i].clicked) {
        quality+=0.5;
        if (quality>3) quality = 0.5;
      }
      
    i++;
    btn_s[i].show();
      btn_s[i].txt[0] = 'Camera Type: '+ (frontal ? 'Frontal' : 'Main');
      if (btn_s[i].clicked) {
        frontal = !frontal;
      }
      
    i++;
    btn_s[i].show();
      btn_s[i].txt[0] = 'File Type: '+ file_type.toUpperCase();
      if (btn_s[i].clicked) {
        if (file_type == 'jpg') file_type = 'png';
        else file_type = 'jpg';
      }
      
    i++;
    btn_s[i].show();
      btn_s[i].txt[0] = 'Saving Delay: '+ savedelay;
      if (btn_s[i].clicked) {
        savedelay+=1000;
        if (savedelay>10000) savedelay = 0;
      }
      
  }
 
  // 04: Filter
  
  if (frame=='L4') { 
  
    btn_n = new sb(IntX,0,IntW-by*2,by);        btn_n.txt[0] = 'Filter';    btn_n.clickable = false;
    btn_x = new sb(IntX+IntW-by,0,by,by);       btn_x.txt[0] = '✖';
    btn_o = new sb(IntX+IntW-by*2,0,by,by);     btn_o.txt[0] = '✓';
        
    filter_input.position(IntX+5,IntY+by+6).size(IntW-12,by*3-12);

    btn_s = [];
    for (let i=1; i<=5; i++) {
      btn_s[i] = new sb(IntX,IntY+by*3+by*i,IntW,by);
    }

    filter_input.value(filter_name+'@'+filter_temp);
    to_play = false;
    frame = 4;
    
  }
  
  if (frame==4) {
    
    background(50);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);
    filter_temp = filter_input.value().split('@')[1];
    filter_name = filter_input.value().split('@')[0];
    
    btn_n.show(); 
    
    btn_x.show(); 
      if (btn_x.clicked) {
        filter_input.position(0,-10000);
        frame = 'L1';
      }
      
    btn_o.show(); 
      if (btn_o.clicked) {
        filter = filter_temp;
        shader_update(filter);
        filter_input.position(0,-10000);
        frame = 'L1';
      }
      
    let i = 0;
    
    i++;  
    btn_s[i].show(); 
      btn_s[i].txt[0] = 'Functions';
      if (btn_s[i].clicked) {
        filter_input.position(0,-10000);
        frame = 'L6';
      }
      
    i++;  
    btn_s[i].show(); 
      btn_s[i].txt[0] = 'Save / Load';
      if (btn_s[i].clicked) {
        filter_input.position(0,-10000);
        //filter_input.value('');
        frame = 'L5';
      }
      
    i++;  
    btn_s[i].show(); 
      btn_s[i].txt[0] = 'New';
      if (btn_s[i].clicked) {
        filter_input.value('NewFilter@:::::');
      }
      
    i++;  
    btn_s[i].show(); 
      btn_s[i].txt[0] = 'Reset Variables';
      if (btn_s[i].clicked) {
        x = [1,0.5,0.5,0.5];
        y = [1,0.5,0.5,0.5]; 
        a = [1,0.5,0.5,0.5]; 
        b = [1,0.5,0.5,0.5]; 
        c = [1,0.5,0.5,0.5]; 
      }
      
    i++;  
    btn_s[i].show(); 
      btn_s[i].txt[0] = 'Convert Variables';
      if (btn_s[i].clicked) {
        filter_input.value(convert(filter_input.value()));
      }
      
  }
 
  // 05: Save/Load
  
  if (frame=='L5') { 
  
    btn_n = new sb(IntX,0,IntW-by,by);          btn_n.txt[0] = 'Save/Load';    btn_n.clickable = false;
    btn_x = new sb(IntX+IntW-by,0,by,by);       btn_x.txt[0] = '✖';
    btn_o = new sb(IntX+IntW-by*2,0,by,by);     btn_o.txt[0] = '✓';
    
    btn_SLOT = [];
    for (let i=0; i<18; i++) {
      btn_SLOT[i] = new sb( IntX+floor(i/6)*IntW/3, IntY+by+(i%6*by), IntW/3, by);
      btn_SLOT[i].txt[1] = nf(i,2)+': ';
      btn_SLOT[i].value  = getItem('striatum_filter'+[i]) != getItem('empty_item') ? getItem('striatum_filter'+[i]) : '---';
      btn_SLOT[i].name   = getItem('striatum_fname' +[i]) != getItem('empty_item') ? getItem('striatum_fname'+[i]) : '';        
      btn_SLOT[i].txt[4] = btn_SLOT[i].value.substring(0, 15);
      btn_SLOT[i].txt[2] = btn_SLOT[i].name;
    }
    
    btn_f = new sb(IntX,IntY+by*7,IntW,by);       btn_f.txt[0] = filter_name+'@'+filter_temp;     

    for (let i=0; i<6; i++) {
      btn_s[i] = new sb( IntX+floor(i/2)*IntW/3, IntY+by*8+(i%2*by), IntW/3, by);
    }
        
    focus = null;
    frame = 5;
    
  }
  
  if (frame==5) {
    
    background(50);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);

    btn_n.show(); 
    btn_x.show(); 
      if (btn_x.clicked) {
        shader_update(filter);
        file_input.position(IntX+by,-10000);
        frame = 'L4';
      }
      
    btn_o.show(); 
      if (btn_o.clicked) {
        filter = filter_temp;
        shader_update(filter);
        file_input.position(IntX+by,-10000);
        frame = 'L1';
      }
      
    for (let i=0; i<18; i++) {
      btn_SLOT[i].show(); 
      if (btn_SLOT[i].clicked) {
        focus = i;
      }
    }

    if (focus>0 || focus===0) btn_SLOT[focus].d = 5;

    btn_f.show(); 
      if (btn_f.clicked) {
        shader_update(filter);
        frame = 'L4';
      }

    btn_s[0].show();
      btn_s[0].txt[0] = 'Load';
      if (btn_s[0].clicked) {
        filter_temp = btn_SLOT[focus].value;
        filter_name = btn_SLOT[focus].name;
        if (getItem('striatum_fxyabc'   +[focus]) != getItem('empty_item')) {
          x = getItem('striatum_fxyabc' +[focus])[0];
          y = getItem('striatum_fxyabc' +[focus])[1];
          a = getItem('striatum_fxyabc' +[focus])[2];
          b = getItem('striatum_fxyabc' +[focus])[3];
          c = getItem('striatum_fxyabc' +[focus])[4];
        }
        frame = 'L5';
      }

    btn_s[2].show();
      btn_s[2].txt[0] = 'Save';
      if (btn_s[2].clicked) {
        storeItem('striatum_filter'+[focus], filter_temp);
        storeItem('striatum_fname' +[focus], filter_name);
        storeItem('striatum_fxyabc'+[focus], [x,y,a,b,c]);
        frame = 'L5';
      }

    btn_s[1].show();
      btn_s[1].txt[0] = 'Export';
      if (btn_s[1].clicked) {
        save(
          [[filter_name+'@'+filter_temp,'\n'+x,'\n'+y,'\n'+a,'\n'+b,'\n'+c].join(';')], 
          "STF-" + 
          filter_name +
          ".txt"
        );
      }

    btn_s[3].show();
      btn_s[3].txt[0] = 'Import';
      if (btn_s[3].clicked) {
        focus = null;
        file_input.position(IntX+2,IntY+2+by).size(IntW-1,IntH-1-by);
      }

    btn_s[4].show();
      btn_s[4].txt[0] = 'Clear';
      if (btn_s[4].clicked) {
        removeItem('striatum_filter'+[focus]);
        removeItem('striatum_fname' +[focus]);
        removeItem('striatum_fxyabc'+[focus]);
        frame = 'L5';
      }

    btn_s[5].show();
      btn_s[5].txt[0] = 'Source';
      if (btn_s[5].clicked) {
        shader_update(filter_temp,true);
        frame = 'L5';
      }

  }
 
  // 06: Functions
  
  if (frame=='L6') { 
  
    btn_n = new sb(IntX,0,IntW-by,by);          btn_n.txt[0] = 'Functions';    btn_n.clickable = false;
    btn_x = new sb(IntX+IntW-by,0,by,by);       btn_x.txt[0] = '✖';  
    
    btn_p = new sb(IntX,IntY+by*2,IntW,IntH-by*4);    btn_p.showborder = false;
    
    for (let i=0; i<6; i++) {
      btn_s[i] = new sb( IntX+IntW/6*i, IntY+by, IntW/6, by);
    }
    
    btn_s[0].txt[0] = 'ALL';
    btn_s[1].txt[0] = 'TX';
    btn_s[2].txt[0] = 'UV';
    btn_s[3].txt[0] = 'CL';
    btn_s[4].txt[0] = 'AL';
    btn_s[5].txt[0] = 'BL';
    
    btn_u = new sb(IntX       ,IntY+IntH-by,IntW/2,by);     btn_u.txt[0] = '▲';
    btn_d = new sb(IntX+IntW/2,IntY+IntH-by,IntW/2,by);     btn_d.txt[0] = '▼';

    frame = 6;
    focus = 0;
    text_line = 0;
    
  }
  
  if (frame==6) {
    
    background(50);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);

    btn_n.show();
    btn_x.show(); 
      if (btn_x.clicked) {
        frame = 'L4';
      }
      
    btn_p.show();
      if (btn_p.pressed) {
        text_line += constrain(floor((pmouseY-mouseY)*0.1),-1,1);
        text_line = constrain(text_line,0,100);
      }
      
    for (let i=0; i<6; i++) {
      btn_s[i].show();
      if (btn_s[i].clicked) {
        focus = i;
        text_line = 0;
      }
    }
    btn_s[focus].d = 5;
    
    btn_u.show();
      if (btn_u.pressed && beat(100) && text_line>0) 
        text_line -= 1;
    btn_d.show(); 
      if (btn_d.pressed && beat(100)) 
        text_line += 1;

    //textWrap(CHAR);
    textAlign(LEFT,TOP);
    
    let txt = ''; 
    
    if (focus==0)
      txt =     
      '• TX:'+'\n'+join(tx_keys, ', ')+'\n'+
      '• UV:'+'\n'+join(uv_keys, ', ')+'\n'+
      '• CL:'+'\n'+join(cl_keys, ', ')+'\n'+
      '• AL:'+'\n'+join(al_keys, ', ')+'\n'+
      '• BL:'+'\n'+join(bl_keys, ', ')+'\n';

    if (focus==1) txt = info(tx_keys,tx_desc);
    if (focus==2) txt = info(uv_keys,uv_desc);
    if (focus==3) txt = info(cl_keys,cl_desc);
    if (focus==4) txt = info(al_keys,al_desc);
    if (focus==5) txt = info(bl_keys,bl_desc);

    text(txt,IntX+bx/2,IntY+by*2.5,IntW-bx,IntH-by*4);
    
  }
 
  // 07: Name Input
  
  if (frame=='L7') { 
  
    btn_n = new sb(IntX,0,IntW-by*2,by);        btn_n.txt[0] = 'Enter the filter name';    btn_n.clickable = false;
    btn_x = new sb(IntX+IntW-by,0,by,by);       btn_x.txt[0] = '✖';
    btn_o = new sb(IntX+IntW-by*2,0,by,by);     btn_o.txt[0] = '✓';
        
    filter_input.position(IntX+5,IntY+by+6).size(IntW-12,by*3-12);
    filter_input.elt.focus();

    filter_input.value('');
    frame = 7;
    
  }
 
  if (frame==7) {
    
    background(50);
    noFill(); stroke(255); rect(IntX,IntY,IntW,IntH);
    
    btn_n.show(); 
    
    btn_x.show(); 
      if (btn_x.clicked) {
        filter_input.position(0,-10000);
        filter_input.value('');
        frame = 'L5';
      }
      
    btn_o.show(); 
      if (btn_o.clicked) {
        filter_input.position(0,-10000);
        save(
          [[filter_temp,'\n'+x,'\n'+y,'\n'+a,'\n'+b,'\n'+c].join(';')], 
          "STF-" + 
          filter_input.value() +
          ".txt"
        );
        frame = 'L5';
      }
    
  }
 
  // ---------------
  
  if (mc==0) {
    mousedragged = false;
  }

  //print(mouseIsPressed);

}

//////////////////////////////////////////

function processing() {

  for (let i = 0; i < glsl_frags.length; i++) {               

    shd[i].setUniform('Ra', 1.0);
    shd[i].setUniform('Rb', 1.0);
    shd[i].setUniform('Rc', 1.0);
    for (let j = 1; j<=3; j++) {
      shd[i].setUniform('x'+j, x[j]);
      shd[i].setUniform('y'+j, y[j]);
      shd[i].setUniform('a'+j, a[j]);
      shd[i].setUniform('b'+j, b[j]);
      shd[i].setUniform('c'+j, c[j]);
      shd[i].setUniform('r'+j, Math.random());
    }
    
    shd[i].setUniform('imi_input', cam_input);
    shd[i].setUniform('imt_input', i == 0 ? cam_input : imgX);
    shd[i].setUniform('imo_input', stackImg);
    
    //print(allow_blur);
    
    if (allow_blur[i]) {
      tinyImg.image(i == 0 ? cam_input : imgX,0,0,tinyImg.width,tinyImg.height); 
      tinyImg.filter(BLUR, width*0.002);
      //print(i+': blur allowed');
    }

    shd[i].setUniform('imb_input', tinyImg);
    
    shd[i].setUniform('time', time%TWO_PI);
    shd[i].setUniform('kFPS', kFPS);
    
    shd[i].setUniform('width', width);
    shd[i].setUniform('height', height);
    shd[i].setUniform('quality', quality);
  
    imgX.shader(shd[i]);
    imgX.rect(0,0,1,1);

  }
    
  stackImg.image(imgX,0,0); 

  
}

function mouseDragged() {
  mousedragged = true;
  return false;
}

function beat(temp) {
  bt[2] = millis();
  if (bt[2] > bt[1]+temp) {    bt[1] = bt[2];    return true;  }
  else return false;
}

function savebeat(temp) {
  btsv[2] = millis();
  if (btsv[2] > btsv[1]+temp) {    btsv[1] = btsv[2];    return true;  }
  else return false;
}

function info(keys, desc) {
  let txt = '';
  for (let i=text_line; i< keys.length; i++) {
    txt += keys[i]+' — '+desc[i]+'\n';
  }
  return txt;
}

function convert(str) {
return str
        .replace(/x1/g,x[1]).replace(/x2/g,x[2]).replace(/x3/g,x[3])
        .replace(/y1/g,y[1]).replace(/y2/g,y[2]).replace(/y3/g,y[3])
        .replace(/a1/g,a[1]).replace(/a2/g,a[2]).replace(/a3/g,a[3])
        .replace(/b1/g,b[1]).replace(/b2/g,b[2]).replace(/b3/g,b[3])
        .replace(/c1/g,c[1]).replace(/c2/g,c[2]).replace(/c3/g,c[3])
  
}

function filter_import(file) {
  if (file.type === 'text') {
    let f = file.data;
    f = split(f,';');
    //print(f);
    if (f[0]!=null && f[0].split('@')[0]!=null) filter_name = f[0].split('@')[0]; else filter_name = 'NewFilter';
    if (f[0]!=null && f[0].split('@')[1]!=null) filter_temp = f[0].split('@')[1];
    if (f[1]!=null)     x = split(f[1],',');
    if (f[2]!=null)     y = split(f[2],',');
    if (f[3]!=null)     a = split(f[3],',');
    if (f[4]!=null)     b = split(f[4],',');
    if (f[5]!=null)     c = split(f[5],',');    
	}
  file_input.position(IntX+by,-10000);
  frame = 'L5';
}

//////////////////////////////////////////

function settings_save() {
  
  let set = [];
  
  set[00] = quality     ;
  set[01] = frontal     ;
  set[02] = vgamode     ;
  set[03] = file_type   ;
  set[04] = pmd         ;
  set[05] = filter      ;
  set[06] = x ;
  set[07] = y ;
  set[08] = a ;
  set[09] = b ;
  set[10] = c ;
  set[11] = savedelay ;
  set[12] = filter_name ;
  set[13] = horient ;

  set = join(set,';');
  storeItem('striatum_settings', str( set ));

  
}

function settings_load(q) {
  
  let set = split( (getItem('striatum_settings') != getItem('empty_item') ? getItem('striatum_settings') : '') , ';');
  let loaded = set.length > 1 ? true : false;
  if(getURLParams().r==1) loaded = false;
  
    //                                              default values
    quality      = loaded & set[00]>0        ? set[00] : 1.0   ;
    frontal      = loaded           ? boolean(set[01]) : false ;
    vgamode      = loaded           ? boolean(set[02]) : false ;
    file_type    = loaded & set[03]          ? set[03] : 'jpg' ; 
    pmd          = loaded & set[04]>=0       ? set[04] : 0     ; 
    filter       = loaded & set[05]!=null    ? set[05] : ':::::'; 
    x            = loaded & set[06]!=null    ? set[06].split(',') : [1,0.5,0.5,0.5];
    y            = loaded & set[07]!=null    ? set[07].split(',') : [1,0.5,0.5,0.5]; 
    a            = loaded & set[08]!=null    ? set[08].split(',') : [1,0.5,0.5,0.5]; 
    b            = loaded & set[09]!=null    ? set[09].split(',') : [1,0.5,0.5,0.5]; 
    c            = loaded & set[10]!=null    ? set[10].split(',') : [1,0.5,0.5,0.5]; 
    savedelay    = loaded & set[11]!=null    ? set[11] : 3000;                            savedelay = Number(savedelay);
    filter_name  = loaded & set[12]!=null    ? set[12] : 'NewFilter'; 
    horient      = loaded           ? boolean(set[13]) : false ;
  
  //print('settings loaded: '+set);
  
}

function saving() {
  queue = asave.length>0?asave.length:'';
  if (to_save) {
    //if (deviceOrientation == 'LANDSCAPE') horient = true; else horient = false;
    let aimg = createGraphics(!horient ? width : height, horient ? width : height);
    if (horient) {
      aimg.translate(height / 2, width / 2);
      aimg.rotate(-PI / 2);
      aimg.imageMode(CENTER);
    }
    aimg.image(stackImg, 0, 0);
    asave.push(aimg);
    avals.push("_["+convert(filter).replace(/:/g,"'")+']');
    to_save = false;
  }
  if (savebeat(savedelay) && asave[0]!=null) {
    save(asave[0], 
      "st-"+year()+nf(month(),2)+nf(day(),2)
      +"-"+nf(hour(),2)+nf(minute(),2)+nf(second(),2)
      +avals[0]
      +'.'+file_type);
    asave[0].remove();
    asave.splice(0,1);
    avals.splice(0,1);
  }
}

//////////////////////////////////////////

class sb {

  constructor(x,y,w,h) {
    
		this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    this.dx = x;
    this.dy = y;
    
    this.ax = x;
    this.ay = y;
    
    this.txt = [];
    
    this.b = 6; // border
    this.d = 0; // visual clicking delay
    
    this.th = 0; // holding time
    this.tc = 0; // click time
    
    this.size = min(bx,by)/3.5;
    this.holdtime = 0;
    this.hold = false;
    this.hide = false;
    this.pressout = false;
    this.showborder = true;
    this.clickable = true;
    
    mouseIsPressed = false;  

  }
  
  show() { if (!this.hide) {
    
    this.x += (this.ax-this.x)/2;
    this.y += (this.ay-this.y)/2;
    
    if (this.showborder) {
      
      this.b = this.d>0?6:1; 
      strokeWeight(this.b);
      stroke(255); noFill(); strokeCap(SQUARE);
      rect(this.x+this.b/2, this.y+this.b/2, this.w-this.b+1, this.h-this.b+1); 
      strokeWeight(1.0);
      
    }
  
    noStroke(); fill(255); textSize(this.size); 
    if(this.hold) fill(255,192,0);
    if(this.txt[0]!=null) { textAlign(CENTER, CENTER);  text(this.txt[0],this.x+this.w/2,  this.y+this.h/2    ); }
    if(this.txt[1]!=null) { textAlign(LEFT, TOP);       text(this.txt[1],this.x+10,        this.y+10          ); }
    if(this.txt[2]!=null) { textAlign(RIGHT, TOP);      text(this.txt[2],this.x+this.w-10, this.y+10          ); }
    if(this.txt[3]!=null) { textAlign(LEFT, BOTTOM);    text(this.txt[3],this.x+10,        this.y+this.h-10+this.size/5 ); }
    if(this.txt[4]!=null) { textAlign(RIGHT, BOTTOM);   text(this.txt[4],this.x+this.w-10, this.y+this.h-10+this.size/5 ); }
    
    if (this.clickable) {
    
      if (mouseX>this.x && mouseX<this.x+this.w && mouseY>this.y && mouseY<this.y+this.h) this.over = true;
      else this.over = false;
      
      if (this.over && mc==1) this.clicked = true;         
      else this.clicked = false;
      
      if (this.clicked) { 
        this.pressed = true;
        mc++;
      }
      if (mc==0) this.pressed = false;
      if (this.pressout && !this.over) this.pressed = false;
      
      if (this.holdtime > 0) {
        if (this.clicked) { this.hold = false; this.tc = millis(); }
        if (this.pressed) this.th = millis()-this.tc;      
        else this.th = 0;
        if (this.th > this.holdtime) this.hold = true;
      }
      
      if (this.clicked || this.pressed) this.d = 5;        
      else this.d = this.d > 0 ? this.d-1*kFPS : 0;
      
    }
      
  }}

}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
