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
var metals = ['copper', 'aluminium', 'iron', 'tin', 'lead', 'silver', 'chromium', 'lithium', 'sodium', 'magnesium', 'potassium', 'calcium', 'titanium', 'manganese', 'nickel', 'zinc', 'tungsten', 'mercury', 'phosphorus', 'sulfur', 'fluorine', 'selenium', 'coal', 'gold'];

function genName(name) {
  if (name === 'Mine') {
    return capitalize(pick(metals)) + ' ' + name;
  } else if (name != null) {
    return wordBasedName() + ' ' + name;
  } else {
    return wordBasedName();
  }
}

module.exports = genName;
