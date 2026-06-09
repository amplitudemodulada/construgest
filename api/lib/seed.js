const db = require('./db');
const bcrypt = require('bcryptjs');

function autoSeed() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (count > 0) return;

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  db.prepare(`INSERT INTO users (username, email, full_name, hashed_password, role, phone) VALUES (?,?,?,?,?,?)`).run('admin', 'admin@construtor.com.br', 'Administrador', hash('admin123'), 'admin', '(11) 99999-9999');
  db.prepare(`INSERT INTO users (username, email, full_name, hashed_password, role, phone) VALUES (?,?,?,?,?,?)`).run('vendedor1', 'vendedor@construtor.com.br', 'Carlos Vendedor', hash('vendedor123'), 'vendedor', '(11) 98888-8888');
  db.prepare(`INSERT INTO users (username, email, full_name, hashed_password, role, phone) VALUES (?,?,?,?,?,?)`).run('estoquista1', 'estoque@construtor.com.br', 'Maria Estoquista', hash('estoque123'), 'estoquista', '(11) 97777-7777');

  const insCat = db.prepare(`INSERT INTO categories (name, icon) VALUES (?,?)`);
  const cats = {};
  const catList = [
    ["Cimento e Argamassas", "building"], ["Madeiras", "tree"], ["Ferramentas", "tool"],
    ["Tintas e Acessórios", "paintbrush"], ["Hidráulica", "droplet"], ["Elétrica", "zap"],
    ["Revestimentos", "square"], ["Telhados e Calhas", "home"], ["Portas e Janelas", "door"], ["Decoração", "palette"]
  ];
  for (const [n, i] of catList) {
    const r = insCat.run(n, i);
    cats[n] = r.lastInsertRowid;
  }

  const insProd = db.prepare(`INSERT INTO products (code, name, category_id, unit, cost_price, selling_price, min_stock, current_stock, max_stock) VALUES (?,?,?,?,?,?,?,?,?)`);
  const prods = [
    ["CIM-001","Cimento CP II 50kg","Cimento e Argamassas","SC",25,42.9,50,200,500],
    ["CIM-002","Argamassa AC III 20kg","Cimento e Argamassas","SC",18,32.9,30,150,300],
    ["MAD-001","Tábua de Pinus 3mx30cm","Madeiras","UN",22,39.9,20,10,100],
    ["MAD-002","Compensado 2,20x1,60 15mm","Madeiras","UN",65,109.9,10,5,50],
    ["FER-001","Martelo de Unha 500g","Ferramentas","UN",25,49.9,10,30,60],
    ["FER-002","Parafusadeira Elétrica 12V","Ferramentas","UN",120,229.9,5,15,30],
    ["TIN-001","Tinta Acrílica 18L Branco","Tintas e Acessórios","UN",85,159.9,10,25,60],
    ["HID-001","Torneira de Mesa Cromada","Hidráulica","UN",55,99.9,5,20,40],
    ["HID-002","Tubo PVC 25mm 3m","Hidráulica","UN",12,24.9,30,120,300],
    ["ELE-001","Cabo Flexível 2,5mm 100m","Elétrica","RL",80,149.9,5,18,40],
    ["REV-001","Porcelanato 60x60 Acetinado","Revestimentos","M2",25,49.9,50,200,500],
    ["TEL-001","Telha Cerâmica Colonial","Telhados e Calhas","UN",2.5,5.9,200,800,2000],
    ["POR-001","Porta Lisa 80x210","Portas e Janelas","UN",140,259.9,5,3,20],
    ["DEC-001","Pastilha de Vidro 30x30","Decoração","M2",35,69.9,10,25,60],
  ];
  for (const p of prods) {
    insProd.run(p[0], p[1], cats[p[2]], p[3], p[4], p[5], p[6], p[7], p[8]);
  }

  const insCust = db.prepare(`INSERT INTO customers (name, document, email, city, state, customer_type, credit_limit) VALUES (?,?,?,?,?,?,?)`);
  insCust.run("João Silva","123.456.789-00","joao@email.com","São Paulo","SP","pf",5000);
  insCust.run("Construtora ABC Ltda","12.345.678/0001-90","contato@abcconstrucoes.com.br","São Paulo","SP","pj",50000);
  insCust.run("Maria Oliveira","987.654.321-00","maria@email.com","Guarulhos","SP","pf",3000);

  const insSup = db.prepare(`INSERT INTO suppliers (company_name, cnpj, city, state) VALUES (?,?,?,?)`);
  insSup.run("Cimenteira Nacional S/A","11.111.111/0001-11","São Paulo","SP");
  insSup.run("Madeireira Pinho Forte","22.222.222/0001-22","Sorocaba","SP");
  insSup.run("Ferramentas Becker Ltda","33.333.333/0001-33","São Bernardo","SP");
  insSup.run("Tintas Colorama Indústria","44.444.444/0001-44","Campinas","SP");
  insSup.run("Hidrocenter Tubos e Conexões","55.555.555/0001-55","São Paulo","SP");

  db.prepare(`INSERT INTO loyalty_programs (name, points_per_real, min_points_redeem, points_per_reais) VALUES (?,?,?,?)`).run("Construtor Fidelidade", 1, 100, 0.05);
}

module.exports = { autoSeed };
