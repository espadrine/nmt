// Automatic Generation of Random Names.

var vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
// Most common letters, digraphs, trigraphs and doubles.
var graphs = ["e","t","a","o","i","n","s","r","th","he","an","in","er","on","re","ed","nd","ha","at","en","es","of","nt","ea","ti","to","io","le","is","ou","ar","as","de","rt","ve","the","and","tha","ent","ion","tio","for","nde","has","nce","tis","oft","men","ss","ee","tt","ll","mm","oo"];
var startWithVowel = graphs.filter(function(e) {
  if (vowels.indexOf(e[0]) >= 0) return e; });
var startWithConsonant = graphs.filter(function(e) {
  if (vowels.indexOf(e[0]) < 0) return e; });

function pick(l) {
  return l[(Math.random() * l.length)|0];
}

function letterBasedName() {
  var len = (Math.random() * 4)|0 + 2;
  var name = '';
  var vowel = true;
  for (var i = 0; i < len; i++) {
    var picked = vowel? pick(startWithVowel): pick(startWithConsonant);
    name += picked;
    vowel = vowels.indexOf(picked[picked.length-1]) < 0;
  }
  if (Math.random() > 0.5) { name = name.slice(1); }
  name = String.fromCharCode(name.charCodeAt(0) - 32)
       + name.slice(1);
  return name;
}

// Approach using combination of words.

var words = ['back', 'bag', 'baker', 'bad', 'bar', 'bat', 'bath', 'beau', 'bec', 'bel', 'ben', 'bin', 'bir', 'black', 'boro', 'bos', 'brad', 'bridge', 'berg', 'burg', 'burn', 'camp', 'carol', 'casa', 'castle', 'cent', 'cester', 'char', 'cław', 'dam', 'dart', 'day', 'fast', 'field', 'ford', 'for', 'fré', 'gate', 'gham', 'grad', 'ham', 'hart', 'head', 'hiro', 'ita', 'jala', 'jiao', 'kan', 'king', 'land', 'las', 'lei', 'lings', 'long', 'mara', 'may', 'milli', 'mont', 'more', 'mouth', 'naga', 'new', 'novo', 'nurem', 'pan', 'pez', 'pit', 'pool', 'port', 'ports', 'pur', 'qing', 'que', 'rack', 'rest', 'richt', 'roch', 'salem', 'san', 'son', 'shiro', 'shima', 'shore', 'smith', 'sor', 'stock', 'tai', 'tela', 'tiago', 'tla', 'to', 'ton', 'vais', 'val', 'viva', 'water', 'wood', 'wor', 'win', 'wind', 'xia', 'yi', 'yoko', 'zaki', 'zao', 'zen'];

function capitalize(name) {
  return String.fromCharCode(name.charCodeAt(0) - 32)
       + name.slice(1);
}

function wordBasedName() {
  var name = pick(words) + pick(words);
  return capitalize(name);
}

// Approach using random metals.
var metals = ['copper', 'aluminium', 'iron', 'tin', 'lead', 'silver', 'chromium', 'lithium', 'sodium', 'magnesium', 'potassium', 'calcium', 'titanium', 'manganese', 'nickel', 'zinc', 'tungsten', 'mercury', 'phosphorus', 'sulfur', 'fluorine', 'selenium', 'gold'];
var extractor = ['mine', 'quarry', 'rig', 'excavator'];

function genName(name) {
  if (name === 'Mine') {
    return capitalize(pick(metals)) + ' ' + capitalize(pick(extractor));
  } else if (name != null) {
    return wordBasedName() + ' ' + name;
  } else {
    return wordBasedName();
  }
}

var firstNamesMale = ['Mohamed', 'Manuel', 'Mamadou', 'Mehdi', 'Thiago',
  'Daniel', 'Miguel', 'Liam', 'Jack', 'William', 'Agustín', 'Santiago',
  'Stevenson', 'Jayden', 'Ramón', 'Luis', 'Sebastián', 'Noah', 'Ethan', 'David',
  'Deven', 'James', 'Aarav', 'Amir', 'Ali', 'Noam', 'George', 'Adam', 'An',
  'Wei', 'Hiroto', 'Min-joon', 'Chia-hao', 'Hiro', 'Somchai', 'Yerasyl',
  'Naranbaatar', 'John', 'Noel', 'Marc', 'Davit', 'Tobias', 'Yusif', 'Maxim',
  'Lucas', 'Nathan', 'Amar', 'Georgi', 'Jacob', 'Oliver', 'Rasmus', 'Elias',
  'Gabriel', 'Giorgi', 'Ben', 'Georgios', 'Malik', 'Charlie', 'Bence', 'Aaron',
  'James', 'Francesco', 'Robert', 'Matas', 'Alexander', 'Luke', 'Mathéo',
  'Nicholas', 'Sem', 'Andrei', 'Artyom', 'Hugo', 'Jonas', 'Yusuf', 'Cooper',
  'Nikau'];
var firstNamesFemale = ['Fatima', 'Mary', 'Aya', 'Mariam', 'Sophia', 'Alysha',
  'Olivia', 'Emma', 'Léa', 'Mariana', 'Gabrielle', 'Ximena', 'Mia', 'Madison',
  'Chloe', 'Isabella', 'Anya', 'Florencia', 'Camille', 'Ai', 'Jing', 'Yuina',
  'Odval', 'Seo-yeon', 'Shu-fen', 'Aadhya', 'Noa', 'Eden', 'Rimas', 'Ayzere',
  'Nor', 'Althea', 'Sumayah', 'Uendi', 'Laia', 'Nareh', 'Anna', 'Zahra',
  'Sevinj', 'Aya', 'Lamija', 'Victoria', 'Lana', 'Eliška', 'Amelia', 'Sara',
  'Amanda', 'Louise', 'Mariami', 'Ivaana', 'Katherine', 'Emilia', 'Alessia',
  'Marija', 'Elena', 'Tess', 'Nora', 'Lena', 'Anastasia', 'Dunja', 'Lucía',
  'Ane', 'Martine', 'Elsa', 'Mia', 'Chiara', 'Charlotte', 'Ruby', 'Aria',
  'Tiare'];
var lastNames = ['Kelmendi', 'Gruber', 'Mammadov', 'Peeters', 'Hodžić',
  'Kovačević', 'Dimitrov', 'Horvat', 'Novák', 'Jensen', 'Tamm', 'Ivanov',
  'Joensen', 'Korhonen', 'Johansson', 'Martin', 'Beridze', 'Müller',
  'Papadopoulos', 'Nagy', 'Murphy', 'Rossi', 'Zogaj', 'Bērziņš', 'Kazlauskas',
  'Schmit', 'Borg', 'Andov', 'De Jong', 'Hansen', 'Kowalski', 'Silva', 'Popa',
  'Smirnov', 'Jovanović', 'Horváth', 'García', 'González', 'Andersson',
  'Bianchi', 'Yılmaz', 'Melnyk', 'Smith', 'Wilson'];

genName.genPerson = function genPerson(options) {
  options = options || {};
  var female = (Math.random() < 0.5);
  var firstName = pick(female? firstNamesFemale: firstNamesMale);
  if (options.parents) {
    var lastName = pick(options.parents);
  } else {
    var lastName = pick(lastNames);
  }
  return {
    female: female,
    firstName: firstName,
    lastName: lastName
  };
}

module.exports = genName;
