export interface Destination {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: 'low' | 'mid' | 'high';
  timeWindow: 'evening' | 'halfday' | 'fullday';
  popularityScore: number;
}

export const destinations: Destination[] = [
  // Cultural & Historical Sites
  {
    id: 'wat-pho',
    nameTh: 'วัดโพธิ์',
    nameEn: 'Wat Pho Temple',
    descTh: 'วัดเก่าแก่ที่มีพระนอนยักษ์และโรงเรียนนวดแผนไทย',
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 95
  },
  {
    id: 'grand-palace',
    nameTh: 'พระบรมมหาราชวัง',
    nameEn: 'The Grand Palace',
    descTh: 'พระราชวังหลวงที่งดงามและมีประวัติศาสตร์ยาวนาน',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    tags: ['cultural', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 98
  },
  {
    id: 'wat-arun',
    nameTh: 'วัดอรุณราชวรารามราชวรมหาวิหาร',
    nameEn: 'Wat Arun (Temple of Dawn)',
    descTh: 'วัดที่มีพระปรางค์สูงงดงามริมแม่น้ำเจ้าพระยา',
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800',
    tags: ['cultural', 'romantic'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 92
  },
  {
    id: 'jim-thompson-house',
    nameTh: 'บ้านจิม ทอมป์สัน',
    nameEn: 'Jim Thompson House',
    descTh: 'บ้านไทยโบราณที่เป็นพิพิธภัณฑ์ผ้าไหมไทย',
    imageUrl: 'https://images.unsplash.com/photo-1571844307880-751c6d86f3f1?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 88
  },
  {
    id: 'national-museum',
    nameTh: 'พิพิธภัณฑสถานแห่งชาติ',
    nameEn: 'Bangkok National Museum',
    descTh: 'พิพิธภัณฑ์ที่เก็บรวบรวมมรดกทางวัฒนธรรมไทย',
    imageUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 85
  },
  {
    id: 'erawan-shrine',
    nameTh: 'ศาลพระพรหม',
    nameEn: 'Erawan Shrine',
    descTh: 'ศาลเจ้าที่มีชื่อเสียงใจกลางกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'evening',
    popularityScore: 80
  },

  // Food & Markets
  {
    id: 'chatuchak-market',
    nameTh: 'ตลาดนัดจตุจักร',
    nameEn: 'Chatuchak Weekend Market',
    descTh: 'ตลาดนัดที่ใหญ่ที่สุดในไทยมีของขายหลากหลาย',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    tags: ['foodie', 'adventure', 'social'],
    budgetBand: 'low',
    timeWindow: 'fullday',
    popularityScore: 94
  },
  {
    id: 'floating-market-damnoen',
    nameTh: 'ตลาดน้ำดำเนินสะดวก',
    nameEn: 'Damnoen Saduak Floating Market',
    descTh: 'ตลาดน้ำที่มีชื่อเสียงกับอาหารและของฝากมากมาย',
    imageUrl: 'https://images.unsplash.com/photo-1540611025311-01df3cdc54ce?w=800',
    tags: ['foodie', 'cultural', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'fullday',
    popularityScore: 90
  },
  {
    id: 'street-food-yaowarat',
    nameTh: 'อาหารริมทางเยาวราช',
    nameEn: 'Yaowarat Street Food',
    descTh: 'ย่านไชน่าทาวน์ที่มีอาหารจีนแท้และของหวานอร่อย',
    imageUrl: 'https://images.unsplash.com/photo-1518933165971-611dbc80ce75?w=800',
    tags: ['foodie', 'social', 'cultural'],
    budgetBand: 'low',
    timeWindow: 'evening',
    popularityScore: 93
  },
  {
    id: 'amphawa-market',
    nameTh: 'ตลาดน้ำอัมพวา',
    nameEn: 'Amphawa Floating Market',
    descTh: 'ตลาดน้ำยามเย็นที่มีอาหารทะเลสดใหม่',
    imageUrl: 'https://images.unsplash.com/photo-1578921879539-a777997fa81f?w=800',
    tags: ['foodie', 'romantic', 'chill'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 87
  },
  {
    id: 'rod-fai-market',
    nameTh: 'ตลาดรถไฟรัชดา',
    nameEn: 'Rot Fai Night Market',
    descTh: 'ตลาดนัดกลางคืนสไตล์วินเทจกับอาหารหลากหลาย',
    imageUrl: 'https://images.unsplash.com/photo-1569235186275-626cb53b83ce?w=800',
    tags: ['foodie', 'social', 'adventure'],
    budgetBand: 'low',
    timeWindow: 'evening',
    popularityScore: 86
  },
  {
    id: 'terminal21-food-court',
    nameTh: 'ฟู้ดคอร์ท เทอร์มินอล 21',
    nameEn: 'Terminal 21 Food Court',
    descTh: 'ฟู้ดคอร์ทที่มีอาหารนานาชาติในห้างสรรพสินค้า',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    tags: ['foodie', 'social'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 82
  },

  // Shopping & Entertainment
  {
    id: 'mbk-center',
    nameTh: 'เอ็มบีเค เซ็นเตอร์',
    nameEn: 'MBK Center',
    descTh: 'ห้างสรรพสินค้าที่มีของราคาถูกและหลากหลาย',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    tags: ['social', 'adventure'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 84
  },
  {
    id: 'siam-paragon',
    nameTh: 'สยามพารากอน',
    nameEn: 'Siam Paragon',
    descTh: 'ห้างสรรพสินค้าหรูหราในใจกลางกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=800',
    tags: ['social', 'romantic'],
    budgetBand: 'high',
    timeWindow: 'halfday',
    popularityScore: 89
  },
  {
    id: 'icon-siam',
    nameTh: 'ไอคอนสยาม',
    nameEn: 'ICONSIAM',
    descTh: 'ห้างสรรพสินค้าใหม่ริมแม่น้ำเจ้าพระยาที่ทันสมัย',
    imageUrl: 'https://images.unsplash.com/photo-1567449303078-57ad995bd956?w=800',
    tags: ['social', 'romantic', 'adventure'],
    budgetBand: 'high',
    timeWindow: 'halfday',
    popularityScore: 91
  },
  {
    id: 'asiatique',
    nameTh: 'เอเชียทีค',
    nameEn: 'Asiatique The Riverfront',
    descTh: 'ตลาดกลางคืนริมแม่น้ำที่มีร้านค้าและร้านอาหาร',
    imageUrl: 'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=800',
    tags: ['social', 'romantic', 'foodie'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 88
  },
  {
    id: 'centralworld',
    nameTh: 'เซ็นทรัลเวิลด์',
    nameEn: 'CentralWorld',
    descTh: 'ห้างสรรพสินค้าขนาดใหญ่ใจกลางเมือง',
    imageUrl: 'https://images.unsplash.com/photo-1561049933-09d71b61a6b2?w=800',
    tags: ['social', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 85
  },

  // Parks & Nature
  {
    id: 'lumphini-park',
    nameTh: 'สวนลุมพินี',
    nameEn: 'Lumphini Park',
    descTh: 'สวนสาธารณะขนาดใหญ่ใจกลางกรุงเทพฯ เหมาะสำหรับออกกำลังกาย',
    imageUrl: 'https://images.unsplash.com/photo-1566997114659-4f4ac8556e04?w=800',
    tags: ['chill', 'romantic'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 83
  },
  {
    id: 'benjakitti-park',
    nameTh: 'สวนเบญจกิติ',
    nameEn: 'Benjakitti Park',
    descTh: 'สวนสาธารณะริมทะเลสาบที่สวยงาม',
    imageUrl: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800',
    tags: ['chill', 'romantic'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 81
  },
  {
    id: 'chatuchak-park',
    nameTh: 'สวนจตุจักร',
    nameEn: 'Chatuchak Park',
    descTh: 'สวนสาธารณะที่เงียบสงบใกล้ตลาดจตุจักร',
    imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
    tags: ['chill', 'romantic'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 78
  },
  {
    id: 'bang-krachao',
    nameTh: 'บางกระเจ้า',
    nameEn: 'Bang Krachao (Green Lung)',
    descTh: 'เกาะเขียวใจกลางกรุงเทพฯ เหมาะสำหรับปั่นจักรยาน',
    imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800',
    tags: ['chill', 'adventure'],
    budgetBand: 'low',
    timeWindow: 'fullday',
    popularityScore: 76
  },

  // Nightlife & Entertainment
  {
    id: 'khao-san-road',
    nameTh: 'ถนนข้าวสาร',
    nameEn: 'Khao San Road',
    descTh: 'ถนนที่มีชีวิตชีวาตลอด 24 ชั่วโมงสำหรับนักท่องเที่ยว',
    imageUrl: 'https://images.unsplash.com/photo-1578842264905-8c5cb9dea4e2?w=800',
    tags: ['social', 'adventure', 'foodie'],
    budgetBand: 'low',
    timeWindow: 'evening',
    popularityScore: 89
  },
  {
    id: 'rca-royal-city',
    nameTh: 'อาร์ซีเอ โรยัล ซิตี้ อเวนิว',
    nameEn: 'RCA (Royal City Avenue)',
    descTh: 'ย่านบันเทิงกลางคืนที่มีผับและคลับมากมาย',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    tags: ['social', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 85
  },
  {
    id: 'thonglor',
    nameTh: 'ทองหล่อ',
    nameEn: 'Thonglor District',
    descTh: 'ย่านไฮโซที่มีร้านอาหารและบาร์หรูหรา',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    tags: ['social', 'romantic', 'foodie'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 87
  },
  {
    id: 'silom-soi-4',
    nameTh: 'สีลม ซอย 4',
    nameEn: 'Silom Soi 4',
    descTh: 'ซอยที่มีบาร์และผับหลากหลายแนว',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800',
    tags: ['social', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 82
  },

  // Rooftop Bars & Views
  {
    id: 'sky-bar-lebua',
    nameTh: 'สกายบาร์ เลอบัว',
    nameEn: 'Sky Bar at Lebua',
    descTh: 'บาร์บนดาดฟ้าที่มีวิวสวยของกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1574483316636-02c0e26aeb35?w=800',
    tags: ['romantic', 'social'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 92
  },
  {
    id: 'vertigo-banyan-tree',
    nameTh: 'เวอร์ติโก แบนยันทรี',
    nameEn: 'Vertigo at Banyan Tree',
    descTh: 'ร้านอาหารบนดาดฟ้าที่มีบรรยากาศโรแมนติก',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
    tags: ['romantic', 'foodie'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 90
  },
  {
    id: 'baiyoke-observation-deck',
    nameTh: 'ดาดฟ้าใบโยค',
    nameEn: 'Baiyoke Sky Tower',
    descTh: 'จุดชมวิวที่สูงที่สุดในกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800',
    tags: ['romantic', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 84
  },
  {
    id: 'mahanakhon-skywalk',
    nameTh: 'มหานคร สกายวอล์ค',
    nameEn: 'Mahanakhon SkyWalk',
    descTh: 'จุดชมวิวและทางเดินกระจกใสบนตึกสูง',
    imageUrl: 'https://images.unsplash.com/photo-1576738449582-806d96331b1c?w=800',
    tags: ['adventure', 'romantic'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 88
  },

  // River & Boat Tours
  {
    id: 'chao-phraya-river-cruise',
    nameTh: 'ล่องเรือแม่น้ำเจ้าพระยา',
    nameEn: 'Chao Phraya River Cruise',
    descTh: 'ล่องเรือชมวิวแม่น้ำเจ้าพระยาและวัดสำคัญ',
    imageUrl: 'https://images.unsplash.com/photo-1571655571204-5dd4a32d7673?w=800',
    tags: ['romantic', 'cultural', 'chill'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 86
  },
  {
    id: 'dinner-cruise',
    nameTh: 'ดินเนอร์ล่องเรือ',
    nameEn: 'Dinner Cruise',
    descTh: 'ล่องเรือรับประทานอาหารเย็นพร้อมวิวยามค่ำคืน',
    imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    tags: ['romantic', 'foodie'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 89
  },
  {
    id: 'longtail-boat-klongs',
    nameTh: 'เรือหางยาวเที่ยวคลอง',
    nameEn: 'Longtail Boat Klong Tour',
    descTh: 'นั่งเรือหางยาวเที่ยวชมคลองและชุมชนริมน้ำ',
    imageUrl: 'https://images.unsplash.com/photo-1512553353614-82a7370096dc?w=800',
    tags: ['cultural', 'adventure', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 83
  },

  // Art & Museums
  {
    id: 'bangkok-art-center',
    nameTh: 'หอศิลปวัฒนธรรมแห่งกรุงเทพมหานคร',
    nameEn: 'Bangkok Art & Culture Centre',
    descTh: 'หอศิลปะร่วมสมัยใจกลางกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 79
  },
  {
    id: 'museum-siam',
    nameTh: 'พิพิธภัณฐ์สยาม',
    nameEn: 'Museum of Siam',
    descTh: 'พิพิธภัณฑ์แห่งการเรียนรู้เรื่องราวความเป็นไทย',
    imageUrl: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 77
  },
  {
    id: 'queen-gallery',
    nameTh: 'หอศิลปแห่งชาติ',
    nameEn: 'Queen\'s Gallery',
    descTh: 'หอศิลปะที่จัดแสดงงานศิลปะของศิลปินไทย',
    imageUrl: 'https://images.unsplash.com/photo-1545735616-0c7c36d6cf0d?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 75
  },

  // Unique Experiences
  {
    id: 'railway-market-maeklong',
    nameTh: 'ตลาดแม่กลอง',
    nameEn: 'Maeklong Railway Market',
    descTh: 'ตลาดที่รถไฟวิ่งผ่านกลางตลาด',
    imageUrl: 'https://images.unsplash.com/photo-1578843242235-8819b5fb7c37?w=800',
    tags: ['adventure', 'cultural', 'foodie'],
    budgetBand: 'mid',
    timeWindow: 'fullday',
    popularityScore: 91
  },
  {
    id: 'snake-farm',
    nameTh: 'สถานเสาวภา สภากาชาดไทย',
    nameEn: 'Snake Farm',
    descTh: 'สถานที่เรียนรู้เกี่ยวกับงูและการทำยาต้านพิษ',
    imageUrl: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?w=800',
    tags: ['adventure', 'cultural'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 74
  },
  {
    id: 'thai-boxing-rajadamnern',
    nameTh: 'สนามมวยราชดำเนิน',
    nameEn: 'Rajadamnern Boxing Stadium',
    descTh: 'สนามมวยไทยที่มีประวัติศาสตร์ยาวนาน',
    imageUrl: 'https://images.unsplash.com/photo-1544116485-7ad531c5d979?w=800',
    tags: ['cultural', 'adventure', 'social'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 80
  },
  {
    id: 'cycling-bang-krajao',
    nameTh: 'ปั่นจักรยานบางกระเจ้า',
    nameEn: 'Cycling at Bang Krajao',
    descTh: 'ปั่นจักรยานชมธรรมชาติในปอดเขียวของกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    tags: ['adventure', 'chill'],
    budgetBand: 'low',
    timeWindow: 'fullday',
    popularityScore: 82
  },

  // Temples & Spiritual
  {
    id: 'wat-saket',
    nameTh: 'วัดสระเกศราชวรมหาวิหาร',
    nameEn: 'Wat Saket (Golden Mount)',
    descTh: 'วัดบนเขาที่มีวิวสวยของกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1523555211660-f1834385db8f?w=800',
    tags: ['cultural', 'chill', 'adventure'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 85
  },
  {
    id: 'wat-benchamabophit',
    nameTh: 'วัดเบญจมบพิตรดุสิตวนาราม',
    nameEn: 'Wat Benchamabophit (Marble Temple)',
    descTh: 'วัดหินอ่อนที่สวยงามในสไตล์ผสมผสาน',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 83
  },
  {
    id: 'wat-suthat',
    nameTh: 'วัดสุทัศน์เทพวราราม',
    nameEn: 'Wat Suthat',
    descTh: 'วัดที่มีพระพุทธรูปองค์ใหญ่และชิงช้าสีแดง',
    imageUrl: 'https://images.unsplash.com/photo-1571844307880-751c6d86f3f1?w=800',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 81
  },

  // Modern & Trendy
  {
    id: 'emporium-emquartier',
    nameTh: 'เอ็มโพเรียม เอ็มควอเทียร์',
    nameEn: 'Emporium EmQuartier',
    descTh: 'ห้างสรรพสินค้าหรูหราย่านสุขุมวิท',
    imageUrl: 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=800',
    tags: ['social', 'romantic'],
    budgetBand: 'high',
    timeWindow: 'halfday',
    popularityScore: 86
  },
  {
    id: 'artbox-market',
    nameTh: 'อาร์ตบ็อกซ์ มาร์เก็ต',
    nameEn: 'Artbox Market',
    descTh: 'ตลาดนัดสุดฮิปในคอนเทนเนอร์สีสวย',
    imageUrl: 'https://images.unsplash.com/photo-1578682994506-b8f463449011?w=800',
    tags: ['social', 'foodie', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 84
  },
  {
    id: 'change-alley',
    nameTh: 'เชนจ์ อัลเลย์',
    nameEn: 'Change Alley',
    descTh: 'พื้นที่สร้างสรรค์และงานฝีมือคนรุ่นใหม่',
    imageUrl: 'https://images.unsplash.com/photo-1566997114659-4f4ac8556e04?w=800',
    tags: ['cultural', 'social'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 78
  },

  // Food Specific
  {
    id: 'gaggan-progressive',
    nameTh: 'แกแกน โปรเกรสซีฟ',
    nameEn: 'Gaggan Progressive Indian',
    descTh: 'ร้านอาหารอินเดียนสุดเก๋ระดับมิชลินสตาร์',
    imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
    tags: ['foodie', 'romantic'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 93
  },
  {
    id: 'jay-fai-street-food',
    nameTh: 'เจ๊ไฝ ผัดไทยไฟฟ้า',
    nameEn: 'Jay Fai Street Food',
    descTh: 'ร้านอาหารข้างทางที่ได้รางวัลมิชลินสตาร์',
    imageUrl: 'https://images.unsplash.com/photo-1518933165971-611dbc80ce75?w=800',
    tags: ['foodie', 'cultural'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 95
  },
  {
    id: 'som-tam-nua',
    nameTh: 'ส้มตำนัว',
    nameEn: 'Som Tam Nua',
    descTh: 'ร้านส้มตำที่มีชื่อเสียงใจกลางกรุงเทพฯ',
    imageUrl: 'https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=800',
    tags: ['foodie', 'social'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 87
  },
  {
    id: 'mango-tango',
    nameTh: 'แมงโก้ แทงโก้',
    nameEn: 'Mango Tango',
    descTh: 'ร้านขนมหวานมะม่วงที่มีชื่อเสียง',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800',
    tags: ['foodie', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 85
  },

  // Wellness & Relaxation
  {
    id: 'thai-massage-wat-pho',
    nameTh: 'นวดแผนไทยวัดโพธิ์',
    nameEn: 'Traditional Thai Massage at Wat Pho',
    descTh: 'โรงเรียนนวดไทยแท้ที่มีประวัติศาสตร์ยาวนาน',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    tags: ['chill', 'cultural'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 89
  },
  {
    id: 'let-relax-spa',
    nameTh: 'เลท รีแล็กซ์ สปา',
    nameEn: 'Let\'s Relax Spa',
    descTh: 'สปาที่มีสาขาหลายแห่งและบริการดี',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    tags: ['chill', 'romantic'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 86
  },
  {
    id: 'health-land-spa',
    nameTh: 'เฮลท์แลนด์ สปา',
    nameEn: 'Health Land Spa',
    descTh: 'สปาราคาประหยัดที่มีมาตรฐานดี',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    tags: ['chill', 'romantic'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 84
  },

  // Day Trips
  {
    id: 'ayutthaya-day-trip',
    nameTh: 'เที่ยวอยุธยาแบบวันเดียว',
    nameEn: 'Ayutthaya Day Trip',
    descTh: 'เที่ยวชมซากปรักหักพังในอดีตราชธานี',
    imageUrl: 'https://images.unsplash.com/photo-1509150693605-c0bc47de4e5f?w=800',
    tags: ['cultural', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'fullday',
    popularityScore: 88
  },
  {
    id: 'kanchanaburi-bridge',
    nameTh: 'กาญจนบุรี สะพานข้ามแคว',
    nameEn: 'Kanchanaburi Bridge Over River Kwai',
    descTh: 'เที่ยวชมสะพานประวัติศาสตร์และธรรมชาติ',
    imageUrl: 'https://images.unsplash.com/photo-1516204842981-1de56efbdf8d?w=800',
    tags: ['cultural', 'adventure', 'chill'],
    budgetBand: 'mid',
    timeWindow: 'fullday',
    popularityScore: 85
  },
  {
    id: 'hua-hin-day-trip',
    nameTh: 'หัวหินแบบวันเดียว',
    nameEn: 'Hua Hin Day Trip',
    descTh: 'เที่ยวทะเลใกล้กรุงเทพฯที่สวยและสะอาด',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    tags: ['chill', 'romantic', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'fullday',
    popularityScore: 90
  },

  // Unique Bangkok
  {
    id: 'airplane-graveyard',
    nameTh: 'สุสานเครื่องบิน',
    nameEn: 'Airplane Graveyard',
    descTh: 'สถานที่แปลกใหม่ที่มีซากเครื่องบินเก่า',
    imageUrl: 'https://images.unsplash.com/photo-1544116485-7ad531c5d979?w=800',
    tags: ['adventure', 'cultural'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 76
  },
  {
    id: 'talad-rot-fai-srinakarin',
    nameTh: 'ตลาดรถไฟศรีนครินทร์',
    nameEn: 'Talad Rot Fai Srinakarin',
    descTh: 'ตลาดนัดขนาดใหญ่ที่มีของเก่าและของเก็บ',
    imageUrl: 'https://images.unsplash.com/photo-1569235186275-626cb53b83ce?w=800',
    tags: ['adventure', 'social', 'foodie'],
    budgetBand: 'low',
    timeWindow: 'evening',
    popularityScore: 83
  },
  {
    id: 'wang-thonglang-market',
    nameTh: 'ตลาดวังทองหลาง',
    nameEn: 'Wang Thonglang Market',
    descTh: 'ตลาดท้องถิ่นที่มีอาหารอร่อยราคาถูก',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    tags: ['foodie', 'cultural'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 79
  }
];