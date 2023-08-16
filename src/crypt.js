
const N = 10;

function keySheme(x, y, z, c) {
  let x_ = 35 * (y - x);
  let y_ = (c - 35) * x - x * z + c * y;
  let z_ = x * y - 3 * z;
  return [x_, y_, z_];
}

function keyTranscript(key, N) {
  let k = [];
  for (let i = 0; i < 8; i++) {
    let str = key.substring(i * 2, i * 2 + 2);
    k.push(str.charCodeAt(0) + str.charCodeAt(1));
    while (!(k[i] < 1)) k[i] /= 10;
  }

  let out = [];

  for (let i = 0; i < 4; i++) {
    let ka = k[i * 2];
    let kb = k[i * 2 + 1];

    let c = ka * 8.4 + 20;

    let x = (kb * 80 - 40) % 1;
    let y = (ka * 80 - 40) % 1;
    let z = (kb * 60) % 1;

    let xyz = [x, y, z];

    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 100; i++) {
        xyz = keySheme(xyz[0] % 1, xyz[1] % 1, xyz[2] % 1, c);
      }
      out.push(xyz[2]);
    }
  }

  for (let i = 0; i < 6; i++) {
    out[i] = Math.round(out[i]) % N;
  }

  out[6] = out[6] < 0 ? -out[6] : out[6];
  out[6] = out[6] % 1;

  out[7] = Math.round(out[7]) % N;
  out[7] = out[7] < 0 ? out[7] + N : out[7];

  return {
    sym: (out[0]^out[1])/N,
    p: [(out[2]^out[3])/N, (out[4]^out[5])/N],
    L: out[6],
    S: out[7],
  };
}

exports.encode = (str, key) => { // кодирование 
  
  let keyPar = keyTranscript(key,N); // Параметры ключа

  let bitsEncoded = []; // массив зашифрованных битов (частей кода символа)

  for (let i = 0; i < str.length; i++) {
    
    let symbol = str.charCodeAt(i);  // получение кода символа
  
    if (symbol>=1040 && symbol<=1103) { // Сдвиг русских символов до 3-значных чисел
        symbol = symbol-200;
    }
  
    const byte1 = (symbol / 100) >> 0;
    const byte2 = ((symbol % 100) - (symbol % 10)) / 10;
    const byte3 = symbol % 10; // разбиение кода символа на цифры
  
    bitsEncoded.push(byte1);
    bitsEncoded.push(byte2);
    bitsEncoded.push(byte3);

  }
  
  let mass = new Array(2);
  mass[0] = 0;
  mass[1] = 0;
  
  let chaosMass = [];
  
  for (let i = 0; i < bitsEncoded.length; i++) {
    mass = chaos(mass[0], mass[1], keyPar.sym, keyPar.p); // Получение значений генератора
    chaosMass.push(mass[0]*N>>0 ^ mass[1]*N>>0); // xor значений
  }

  chaosMass = chaos_digitalization(chaosMass, N); // дискретизация

  for (let i=0;i<bitsEncoded.length;i++) {
      bitsEncoded[i] = bitsEncoded[i] + chaosMass[i]; // наложение шума 
      bitsEncoded[i] = bitsEncoded[i] % N;
  }
  
  let fk
  for (let i = 0; i < str.length * 3; i++) {
    if (i == 0) {
      fk = logistic(keyPar.L);
      if (fk == 0.5) fk = 0.6;
      bitsEncoded[i] = diffuse((fk * N) >> 0, bitsEncoded[i], keyPar.S);
    } else {
      fk = logistic(fk);
      if (fk == 0.5) fk = 0.6;
      bitsEncoded[i] = diffuse(
        (fk * N) >> 0,
        bitsEncoded[i],
        bitsEncoded[i - 1]
      );
    }
  }

  return bitsEncoded;
  
}

exports.translate = (bits) => { // перевод битов (частей кода символа) в символы
  let result = "";

  for (let i = 0; i < bits.length / 3; i++) {
    result =
      result +
      String.fromCharCode(
        bits[i * 3] * 100 + bits[i * 3 + 1] * 10 + bits[i * 3 + 2]
      );
  }

  return result;
}

exports.decode = (bits, key) => { // декодирование
  
  let keyPar = keyTranscript(key,N); // получение параметров ключа

  let resultDecoded = "";
  let bitsDecoded = [];

  let fk
  for (let i = 0; i < bits.length; i++) {
    if (i == 0) {
      fk = logistic(keyPar.L);
      if (fk == 0.5) fk = 0.6;
      bitsDecoded.push(undiffuse((fk * N) >> 0, keyPar.S, bits[i]));
    } else {
      fk = logistic(fk);
      if (fk == 0.5) fk = 0.6;
      bitsDecoded.push(undiffuse((fk * N) >> 0, bits[i - 1], bits[i]));
    }
  }

  let mass = new Array(2);
  mass[0] = 0;
  mass[1] = 0;

  let chaosMass = [];

  for (let i = 0; i < bits.length; i++) {
    mass = chaos(mass[0], mass[1], keyPar.sym, keyPar.p); // получение значений генератора
    chaosMass.push(mass[0]*N>>0 ^ mass[1]*N>>0); // xor значений
  }

  chaosMass = chaos_digitalization(chaosMass, N); // дискретизация

  for (let i=0;i<bits.length;i++) {
      bitsDecoded[i] = bitsDecoded[i] - chaosMass[i]; // ликвидация шума
      bitsDecoded[i] = Math.round(bitsDecoded[i] % N);
      bitsDecoded[i] = bitsDecoded[i] < 0 ? bitsDecoded[i] + N : bitsDecoded[i];
  }


  for (let i=0; i<bitsDecoded.length;i=i+3)
  {
      let out = bitsDecoded[i]*100 + bitsDecoded[i+1]*10 + bitsDecoded[i+2];
      if (out>=840 && out<=903) { // обратный сдвиг русских символов 
          out = out+200;
      }
      resultDecoded = resultDecoded + String.fromCharCode(out);
  }

  return resultDecoded;

}

function chaos(x, y, sym, p) { // генератор
  let mass = new Array(2);
  mass[1] = ((1-sym)*Math.sin(Math.pow(x, 2)));
  mass[0] = sym*(Math.cos(1-p[0]*Math.pow(x, 2))+Math.pow(Math.exp(1),p[1]*Math.pow(y, 2)));
  return mass;
}

function chaos_digitalization(mass, N) { // дискретизация значений, полученных из генератора
  for (let i = 0; i < mass.length; i++) {
    mass[i] =
      mass[i] <= -N
        ? mass[i] + N * (-(mass[i] / N)^0)
        : mass[i] >= N
        ? mass[i] - N * ((mass[i] / N)^0)
        : mass[i];
  }
  return mass;
}

function logistic(fk) {
  return 4 * fk * (1 - fk);
}

function diffuse(fk, ik, ckpre) {
  return fk ^ (ik + fk) % N ^ ckpre;
}

function undiffuse(fk, ckpre, ck) {
  return ((fk ^ ck ^ ckpre) + N - fk) % N;
}