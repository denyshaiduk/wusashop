'use strict';
/*
  Одноразовий скрипт наповнення каталогу товарами на основі фото з
  assets/images/products/. Запуск: node server/seed-products.js
  Видаляє існуючі товари (крім замовлень) і вставляє новий набір.
*/

const db = require('./db');

const FILES = [
  'ChatGPT Image 9 сент. 2026 г., 13_18_18.png',
  'ChatGPT Image 9 сент. 2026 г., 13_18_24.png',
  'ChatGPT Image 9 сент. 2026 г., 13_18_41.png',
  'ChatGPT Image 9 сент. 2026 г., 13_18_47.png',
  'ChatGPT Image 9 сент. 2026 г., 13_18_52.png',
  'ChatGPT Image 9 сент. 2026 г., 13_18_58.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_08.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_13.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_25.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_30.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_36.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_43.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_49.png',
  'ChatGPT Image 9 сент. 2026 г., 13_19_54.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_01.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_07.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_12.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_25.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_42.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_49.png',
  'ChatGPT Image 9 сент. 2026 г., 13_20_59.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_05.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_10.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_18.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_24.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_26.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_31.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_32.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_39.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_47.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_53.png',
  'ChatGPT Image 9 сент. 2026 г., 13_21_59.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_05.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_10.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_15.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_21.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_26.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_34.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_39.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_45.png',
  'ChatGPT Image 9 сент. 2026 г., 13_22_53.png',
  'ChatGPT Image 9 сент. 2026 г., 13_23_19.png',
  'ChatGPT Image 9 сент. 2026 г., 13_23_34.png',
  'ChatGPT Image 9 сент. 2026 г., 13_23_42.png',
  'ChatGPT Image 9 сент. 2026 г., 13_23_49.png',
  'ChatGPT Image 9 сент. 2026 г., 13_23_55.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_07.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_14.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_25.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_33.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_41.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_49.png',
  'ChatGPT Image 9 сент. 2026 г., 13_24_56.png',
  'ChatGPT Image 9 сент. 2026 г., 13_25_00.png',
];

// slice(from, to) — 1-based, включно, згідно з порядком файлів у папці
function slice(from, to) {
  return FILES.slice(from - 1, to).map((f) => {
    const name = f.slice(0, f.lastIndexOf('.'));
    return `assets/images/products/optimized/${name}.webp`;
  });
}

const PRODUCTS = [
  { name: 'Казан чавунний з кришкою', category: 'Казани', description: 'Масивний чавунний казан із рельєфною кришкою. Рівномірно тримає жар і підходить для плову, тушкованого м’яса та домашніх страв на вогні.', price: 2650, craftTime: 'від 3 днів', isHit: true, images: [slice(1, 1)[0], slice(12, 13)[0], slice(14, 14)[0]] },
  { name: 'Сковорода WOK чавунна', category: 'Казани', description: 'Глибока чавунна WOK-сковорода для швидкого обсмажування та страв із димком. Робоча поверхня прогрівається рівно й довго зберігає температуру.', price: 1850, craftTime: 'від 3 днів', isHit: false, images: slice(2, 2) },
  { name: 'Сковорода чавунна з дерев’яною ручкою', category: 'Чавунний посуд', description: 'Класична чавунна сковорода для плити, печі та відкритого вогню. Натуральна дерев’яна ручка додає характеру й зручності під час подачі.', price: 1280, craftTime: 'від 3 днів', isHit: true, images: [slice(3, 3)[0], slice(4, 4)[0], slice(9, 9)[0]] },
  { name: 'Сковорода-гриль чавунна', category: 'Чавунний посуд', description: 'Ребриста сковорода-гриль для виразної скоринки на м’ясі, овочах та рибі. Чавун утримує температуру, а рельєф відводить зайвий жир.', price: 1450, craftTime: 'від 3 днів', isHit: false, images: [slice(5, 5)[0], slice(6, 6)[0], slice(7, 7)[0]] },
  { name: 'Набір чавунного посуду', category: 'Чавунний посуд', description: 'Добірка практичного чавунного посуду для кухні та відпочинку: сковороди різного діаметра й формату. Вдалий подарунок для тих, хто любить готувати.', price: 3900, craftTime: 'від 5 днів', isHit: false, images: [slice(8, 8)[0], slice(10, 10)[0], slice(11, 11)[0]] },
  { name: 'Ополоник сталевий з дерев’яною ручкою', category: 'Аксесуари для гриля', description: 'Міцний глибокий ополоник для казана та великого посуду. Подовжена ручка тримає дистанцію від жару, а петля дозволяє зручно зберігати його поруч.', price: 420, craftTime: 'від 2 днів', isHit: false, images: slice(15, 16) },
  { name: 'Шумівка для казана', category: 'Аксесуари для гриля', description: 'Перфорована шумівка з нержавіючої сталі для плову, овочів та страв у казані. Легка, зручна й розрахована на щоденне використання.', price: 440, craftTime: 'від 2 днів', isHit: false, images: slice(17, 17) },
  { name: 'Комплект для казана: тринога та кришка', category: 'Аксесуари для гриля', description: 'Стійка металева тринога для казана й практична чавунна кришка. Базовий комплект для приготування страв просто неба.', price: 1250, craftTime: 'від 4 днів', isHit: false, images: [slice(18, 18)[0], slice(19, 19)[0], slice(20, 20)[0]] },
  { name: 'Набір шампурів з латунними ручками', category: 'Шампури', description: 'Шість шампурів із полірованої сталі та теплими латунними ручками. Стриманий преміальний вигляд для мангала, гриля та подарунка.', price: 1450, craftTime: 'від 4 днів', isHit: true, images: slice(21, 21) },
  { name: 'Вилка для гриля подвійна', category: 'Аксесуари для гриля', description: 'Подвійна вилка з латунною ручкою для м’яса й великих шматків на решітці. Надійна конструкція забезпечує впевнений контроль під час подачі.', price: 520, craftTime: 'від 3 днів', isHit: false, images: slice(22, 22) },
  { name: 'Вилка для гриля класична', category: 'Аксесуари для гриля', description: 'Довга вилка для гриля з декоративною металевою ручкою. Зручно перевертати м’ясо, ковбаски та овочі, не наближаючись до жару.', price: 460, craftTime: 'від 3 днів', isHit: false, images: slice(24, 24) },
  { name: 'Шампур з дерев’яною ручкою', category: 'Шампури', description: 'Окремий довгий шампур із натуральною дерев’яною ручкою. Надійна сталь, збалансована вага та комфортний хват для щоденного гриля.', price: 190, craftTime: 'від 2 днів', isHit: false, images: slice(25, 25) },
  { name: 'Шампур з латунною ручкою', category: 'Шампури', description: 'Елегантний шампур із литою латунною ручкою. Гарне поєднання практичної сталі та виразного декору для домашнього мангала.', price: 260, craftTime: 'від 2 днів', isHit: false, images: slice(27, 27) },
  { name: 'Відкривачка для пляшок «Гриль»', category: 'Аксесуари для гриля', description: 'Компактна металева відкривачка з декоративною ручкою. Невеликий, але доречний аксесуар для пікніка та подарункового набору.', price: 290, craftTime: 'від 2 днів', isHit: false, images: slice(29, 29) },
  { name: 'Вилка для м’яса з дерев’яною ручкою', category: 'Аксесуари для гриля', description: 'Зручна дворіжкова вилка для подачі та перевертання м’яса. Натуральна дерев’яна ручка комфортна в руці й не перегрівається.', price: 390, craftTime: 'від 3 днів', isHit: false, images: slice(30, 30) },
  { name: 'Лопатка для гриля', category: 'Аксесуари для гриля', description: 'Широка перфорована лопатка для бургерів, овочів і стейків. Довга ручка робить роботу біля вогню зручною та безпечною.', price: 450, craftTime: 'від 3 днів', isHit: false, images: slice(31, 31) },
  { name: 'Щипці для гриля з латунними ручками', category: 'Аксесуари для гриля', description: 'Парні щипці для точного перевертання м’яса й овочів. Міцна сталь та латунні ручки додають комплекту відчуття ручної роботи.', price: 650, craftTime: 'від 3 днів', isHit: false, images: slice(32, 32) },
  { name: 'Вилка для гриля з роговою ручкою', category: 'Аксесуари для гриля', description: 'Довга вилка для гриля з фактурною ручкою. Виразний аксесуар для тих, хто збирає власний комплект для вогню.', price: 560, craftTime: 'від 3 днів', isHit: false, images: slice(33, 33) },
  { name: 'Набір ножів з роговими ручками', category: 'Ножі', description: 'Три кухонні ножі ручної роботи з темними клинками й фактурними роговими ручками. У наборі є форми для щоденного приготування та подачі.', price: 2900, craftTime: 'від 7 днів', isHit: true, images: [slice(34, 34)[0], slice(36, 36)[0]] },
  { name: 'Набір пласких шампурів', category: 'Шампури', description: 'Пара пласких шампурів із крученою ручкою. Форма добре утримує шматки м’яса, а міцна сталь витримує регулярне використання.', price: 520, craftTime: 'від 3 днів', isHit: false, images: slice(35, 35) },
  { name: 'Набір ножів зі світлими ручками', category: 'Ножі', description: 'Три ножі з художньо оформленими клинками та світлими ручками. Виразний набір для кухні, мангала або подарунка.', price: 3100, craftTime: 'від 7 днів', isHit: false, images: slice(37, 37) },
  { name: 'Набір ножів з темними ручками', category: 'Ножі', description: 'Практичний набір із трьох ножів з темними ергономічними ручками. Контрастне оформлення робить їх особливо виразними на кухні та біля гриля.', price: 2950, craftTime: 'від 7 днів', isHit: false, images: slice(38, 38) },
  { name: 'Пара ножів зі світлими ручками', category: 'Ножі', description: 'Два ножі ручної роботи для точного нарізання та подачі. Клинки мають лаконічне оформлення, а ручки зручно лежать у долоні.', price: 1950, craftTime: 'від 6 днів', isHit: false, images: slice(39, 39) },
  { name: 'Подарунковий набір чарок «Ведмідь»', category: 'Подарункові набори', description: 'Шість декоративних чарок у дерев’яній коробці. Деталізований рельєф і презентаційна упаковка роблять набір готовим подарунком.', price: 3400, craftTime: 'від 5 днів', isHit: true, images: [slice(40, 40)[0], slice(41, 41)[0]] },
  { name: 'Подарунковий набір для барбекю', category: 'Подарункові набори', description: 'Великий подарунковий комплект у дерев’яній коробці: шампури, чарки та аксесуари для відпочинку. Виглядає статусно й одразу готовий до вручення.', price: 5200, craftTime: 'від 7 днів', isHit: true, images: [slice(42, 42)[0], slice(43, 43)[0]] },
  { name: 'Підставка під казан', category: 'Аксесуари для гриля', description: 'Легка та стійка металева підставка для казана. Складається для зберігання і дає надійну основу для готування над вогнем.', price: 780, craftTime: 'від 3 днів', isHit: false, images: slice(44, 44) },
  { name: 'Набір шампурів «Рибалки»', category: 'Шампури', description: 'Преміальний набір шампурів із литими ручками у рибальській тематиці. Полірована сталь і детальне лиття перетворюють звичний гриль на ритуал.', price: 2600, craftTime: 'від 5 днів', isHit: true, images: [slice(45, 45)[0], slice(46, 46)[0], slice(49, 49)[0]] },
  { name: 'Набір шампурів у шкіряному чохлі «Мисливець»', category: 'Шампури', description: 'Подарунковий набір шампурів у чорному шкіряному чохлі з декоративним литтям. Зручний для перевезення, статусний на вигляд і готовий до вручення.', price: 2400, craftTime: 'від 7 днів', isHit: false, images: [slice(47, 47)[0], slice(48, 48)[0]] },
  { name: 'Набір шампурів з темними ручками', category: 'Шампури', description: 'Набір шампурів із гладкими темними ручками та міцними сталевими стрижнями. Лаконічний дизайн для тих, хто цінує функціональність.', price: 1650, craftTime: 'від 4 днів', isHit: false, images: slice(50, 50) },
  { name: 'Набір шампурів «Щука»', category: 'Шампури', description: 'Шампури з декоративними ручками у формі риби. Деталізоване лиття, надійна сталь і помітний дизайн для особливих виїздів на природу.', price: 2750, craftTime: 'від 5 днів', isHit: true, images: [slice(51, 51)[0], slice(52, 52)[0]] },
  { name: 'Набір шампурів у шкіряному чохлі', category: 'Шампури', description: 'Компактний набір шампурів у чорному шкіряному чохлі. Зручно перевозити, зберігати й дарувати без додаткового пакування.', price: 2150, craftTime: 'від 5 днів', isHit: false, images: slice(53, 53) },
];

db.exec('DELETE FROM products');

const insert = db.prepare(`
  INSERT INTO products (name, category, description, price, old_price, image, images, status, craft_time, is_hit, sort_order)
  VALUES (@name, @category, @description, @price, @old_price, @image, @images, @status, @craft_time, @is_hit, @sort_order)
`);

db.exec('BEGIN');
try {
  PRODUCTS.forEach((p, i) => {
    insert.run({
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      old_price: null,
      image: p.images[0] || '',
      images: JSON.stringify(p.images),
      status: 'in_stock',
      craft_time: p.craftTime || '',
      is_hit: p.isHit ? 1 : 0,
      sort_order: i,
    });
  });
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}

console.log(`Готово: додано ${PRODUCTS.length} товарів, використано ${FILES.length} фото.`);
