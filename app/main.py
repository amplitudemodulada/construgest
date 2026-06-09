from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import auth, products, customers, suppliers, sales, financial, purchases, reports
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.customer import Customer, CustomerType
from app.models.supplier import Supplier
from app.models.loyalty import LoyaltyProgram
from app.utils.auth import get_password_hash
import os

Base.metadata.create_all(bind=engine)

def auto_seed():
    db = SessionLocal()
    if db.query(User).count() == 0:
        db.add(User(username="admin", email="admin@construtor.com.br", full_name="Administrador", hashed_password=get_password_hash("admin123"), role=UserRole.ADMIN, phone="(11) 99999-9999"))
        db.add(User(username="vendedor1", email="vendedor@construtor.com.br", full_name="Carlos Vendedor", hashed_password=get_password_hash("vendedor123"), role=UserRole.SELLER, phone="(11) 98888-8888"))
        db.add(User(username="estoquista1", email="estoque@construtor.com.br", full_name="Maria Estoquista", hashed_password=get_password_hash("estoque123"), role=UserRole.STOCKIST, phone="(11) 97777-7777"))
        db.flush()

        cats = {}
        for name, icon, desc in [
            ("Cimento e Argamassas", "building", ""), ("Madeiras", "tree", ""), ("Ferramentas", "tool", ""),
            ("Tintas e Acessórios", "paintbrush", ""), ("Hidráulica", "droplet", ""), ("Elétrica", "zap", ""),
            ("Revestimentos", "square", ""), ("Telhados e Calhas", "home", ""), ("Portas e Janelas", "door", ""), ("Decoração", "palette", "")
        ]:
            c = Category(name=name, icon=icon)
            db.add(c); db.flush(); cats[name] = c

        prods = [
            ("CIM-001","Cimento CP II 50kg","Cimento e Argamassas","SC",25,42.9,50,200,500),
            ("CIM-002","Argamassa AC III 20kg","Cimento e Argamassas","SC",18,32.9,30,150,300),
            ("MAD-001","Tábua de Pinus 3mx30cm","Madeiras","UN",22,39.9,20,10,100),
            ("MAD-002","Compensado 2,20x1,60 15mm","Madeiras","UN",65,109.9,10,5,50),
            ("FER-001","Martelo de Unha 500g","Ferramentas","UN",25,49.9,10,30,60),
            ("FER-002","Parafusadeira Elétrica 12V","Ferramentas","UN",120,229.9,5,15,30),
            ("TIN-001","Tinta Acrílica 18L Branco","Tintas e Acessórios","UN",85,159.9,10,25,60),
            ("HID-001","Torneira de Mesa Cromada","Hidráulica","UN",55,99.9,5,20,40),
            ("HID-002","Tubo PVC 25mm 3m","Hidráulica","UN",12,24.9,30,120,300),
            ("ELE-001","Cabo Flexível 2,5mm 100m","Elétrica","RL",80,149.9,5,18,40),
            ("REV-001","Porcelanato 60x60 Acetinado","Revestimentos","M2",25,49.9,50,200,500),
            ("TEL-001","Telha Cerâmica Colonial","Telhados e Calhas","UN",2.5,5.9,200,800,2000),
            ("POR-001","Porta Lisa 80x210","Portas e Janelas","UN",140,259.9,5,3,20),
            ("DEC-001","Pastilha de Vidro 30x30","Decoração","M2",35,69.9,10,25,60),
        ]
        for code,name,cat,unit,cost,sell,min_stk,cur_stk,max_stk in prods:
            db.add(Product(code=code, name=name, category_id=cats[cat].id, unit=unit, cost_price=cost, selling_price=sell, min_stock=min_stk, current_stock=cur_stk, max_stock=max_stk))

        for ct in [("João Silva","123.456.789-00","joao@email.com","São Paulo","SP",CustomerType.PF,5000),
                   ("Construtora ABC Ltda","12.345.678/0001-90","contato@abcconstrucoes.com.br","São Paulo","SP",CustomerType.PJ,50000),
                   ("Maria Oliveira","987.654.321-00","maria@email.com","Guarulhos","SP",CustomerType.PF,3000)]:
            db.add(Customer(name=ct[0], document=ct[1], email=ct[2], city=ct[3], state=ct[4], customer_type=ct[5], credit_limit=ct[6]))

        for s in [("Cimenteira Nacional S/A","11.111.111/0001-11","São Paulo","SP"),
                  ("Madeireira Pinho Forte","22.222.222/0001-22","Sorocaba","SP"),
                  ("Ferramentas Becker Ltda","33.333.333/0001-33","São Bernardo","SP"),
                  ("Tintas Colorama Indústria","44.444.444/0001-44","Campinas","SP"),
                  ("Hidrocenter Tubos e Conexões","55.555.555/0001-55","São Paulo","SP")]:
            db.add(Supplier(company_name=s[0], cnpj=s[1], city=s[2], state=s[3]))

        db.add(LoyaltyProgram(name="Construtor Fidelidade", points_per_real=1, min_points_redeem=100, points_per_reais=0.05))
        db.commit()
    db.close()

auto_seed()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(sales.router)
app.include_router(financial.router)
app.include_router(purchases.router)
app.include_router(reports.router)

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION, "app": settings.APP_NAME}
