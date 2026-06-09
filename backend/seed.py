from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.customer import Customer, CustomerType
from app.models.supplier import Supplier
from app.models.loyalty import LoyaltyProgram
from app.utils.auth import get_password_hash

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()

    if db.query(User).count() > 0:
        print("Banco já possui dados. Pulando seed.")
        db.close()
        return

    admin = User(
        username="admin",
        email="admin@construgest.com.br",
        full_name="Administrador",
        hashed_password=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
        phone="(11) 99999-9999"
    )
    db.add(admin)

    seller = User(
        username="vendedor1",
        email="vendedor@construgest.com.br",
        full_name="Carlos Vendedor",
        hashed_password=get_password_hash("vendedor123"),
        role=UserRole.SELLER,
        is_active=True,
        phone="(11) 98888-8888"
    )
    db.add(seller)

    stockist = User(
        username="estoquista1",
        email="estoque@construgest.com.br",
        full_name="Maria Estoquista",
        hashed_password=get_password_hash("estoque123"),
        role=UserRole.STOCKIST,
        is_active=True,
        phone="(11) 97777-7777"
    )
    db.add(stockist)
    db.flush()

    categories_data = [
        {"name": "Cimento e Argamassas", "icon": "building", "description": "Cimentos, argamassas, rejunte e aditivos"},
        {"name": "Madeiras", "icon": "tree", "description": "Madeiras, compensados, MDF e derivados"},
        {"name": "Ferramentas", "icon": "tool", "description": "Ferramentas manuais e elétricas"},
        {"name": "Tintas e Acessórios", "icon": "paintbrush", "description": "Tintas, vernizes, solventes e pincéis"},
        {"name": "Hidráulica", "icon": "droplet", "description": "Tubos, conexões, torneiras e metais"},
        {"name": "Elétrica", "icon": "zap", "description": "Fios, cabos, disjuntores e lâmpadas"},
        {"name": "Revestimentos", "icon": "square", "description": "Azulejos, porcelanatos, pisos e pastilhas"},
        {"name": "Telhados e Calhas", "icon": "home", "description": "Telhas, calhas, rufos e estruturas"},
        {"name": "Portas e Janelas", "icon": "door", "description": "Portas, janelas, esquadrias e vidros"},
        {"name": "Decoração", "icon": "palette", "description": "Itens de decoração e acabamento"}
    ]
    category_objects = {}
    for cat_data in categories_data:
        cat = Category(**cat_data)
        db.add(cat)
        db.flush()
        category_objects[cat.name] = cat

    products_data = [
        {"code": "CIM-001", "name": "Cimento CP II 50kg", "category_name": "Cimento e Argamassas", "unit": "SC", "cost_price": 25.00, "selling_price": 42.90, "min_stock": 50, "current_stock": 200, "max_stock": 500},
        {"code": "CIM-002", "name": "Argamassa AC III 20kg", "category_name": "Cimento e Argamassas", "unit": "SC", "cost_price": 18.00, "selling_price": 32.90, "min_stock": 30, "current_stock": 150, "max_stock": 300},
        {"code": "CIM-003", "name": "Rejunte Colorido 1kg", "category_name": "Cimento e Argamassas", "unit": "UN", "cost_price": 8.00, "selling_price": 15.90, "min_stock": 20, "current_stock": 80, "max_stock": 200},
        {"code": "MAD-001", "name": "Tábua de Pinus 3mx30cm", "category_name": "Madeiras", "unit": "UN", "cost_price": 22.00, "selling_price": 39.90, "min_stock": 20, "current_stock": 10, "max_stock": 100},
        {"code": "MAD-002", "name": "Compensado 2,20x1,60 15mm", "category_name": "Madeiras", "unit": "UN", "cost_price": 65.00, "selling_price": 109.90, "min_stock": 10, "current_stock": 5, "max_stock": 50},
        {"code": "FER-001", "name": "Martelo de Unha 500g", "category_name": "Ferramentas", "unit": "UN", "cost_price": 25.00, "selling_price": 49.90, "min_stock": 10, "current_stock": 30, "max_stock": 60},
        {"code": "FER-002", "name": "Parafusadeira Elétrica 12V", "category_name": "Ferramentas", "unit": "UN", "cost_price": 120.00, "selling_price": 229.90, "min_stock": 5, "current_stock": 15, "max_stock": 30},
        {"code": "TIN-001", "name": "Tinta Acrílica 18L Branco", "category_name": "Tintas e Acessórios", "unit": "UN", "cost_price": 85.00, "selling_price": 159.90, "min_stock": 10, "current_stock": 25, "max_stock": 60},
        {"code": "TIN-002", "name": "Verniz Poliuretano 900ml", "category_name": "Tintas e Acessórios", "unit": "UN", "cost_price": 32.00, "selling_price": 59.90, "min_stock": 10, "current_stock": 40, "max_stock": 80},
        {"code": "HID-001", "name": "Torneira de Mesa Cromada", "category_name": "Hidráulica", "unit": "UN", "cost_price": 55.00, "selling_price": 99.90, "min_stock": 5, "current_stock": 20, "max_stock": 40},
        {"code": "HID-002", "name": "Tubo PVC 25mm 3m", "category_name": "Hidráulica", "unit": "UN", "cost_price": 12.00, "selling_price": 24.90, "min_stock": 30, "current_stock": 120, "max_stock": 300},
        {"code": "ELE-001", "name": "Cabo Flexível 2,5mm 100m", "category_name": "Elétrica", "unit": "RL", "cost_price": 80.00, "selling_price": 149.90, "min_stock": 5, "current_stock": 18, "max_stock": 40},
        {"code": "ELE-002", "name": "Disjuntor 16A Monofásico", "category_name": "Elétrica", "unit": "UN", "cost_price": 10.00, "selling_price": 22.90, "min_stock": 20, "current_stock": 60, "max_stock": 150},
        {"code": "REV-001", "name": "Porcelanato 60x60 Acetinado", "category_name": "Revestimentos", "unit": "M2", "cost_price": 25.00, "selling_price": 49.90, "min_stock": 50, "current_stock": 200, "max_stock": 500},
        {"code": "TEL-001", "name": "Telha Cerâmica Colonial", "category_name": "Telhados e Calhas", "unit": "UN", "cost_price": 2.50, "selling_price": 5.90, "min_stock": 200, "current_stock": 800, "max_stock": 2000},
        {"code": "POR-001", "name": "Porta Lisa 80x210", "category_name": "Portas e Janelas", "unit": "UN", "cost_price": 140.00, "selling_price": 259.90, "min_stock": 5, "current_stock": 3, "max_stock": 20},
        {"code": "DEC-001", "name": "Pastilha de Vidro 30x30", "category_name": "Decoração", "unit": "M2", "cost_price": 35.00, "selling_price": 69.90, "min_stock": 10, "current_stock": 25, "max_stock": 60},
    ]
    for prod_data in products_data:
        category_name = prod_data.pop("category_name")
        product = Product(
            category_id=category_objects[category_name].id,
            **prod_data
        )
        db.add(product)

    customers_data = [
        {"customer_type": CustomerType.PF, "name": "João Silva", "document": "123.456.789-00", "email": "joao@email.com", "phone": "(11) 91234-5678", "city": "São Paulo", "state": "SP", "credit_limit": 5000},
        {"customer_type": CustomerType.PJ, "name": "Construtora ABC Ltda", "company_name": "ABC Construções", "document": "12.345.678/0001-90", "email": "contato@abcconstrucoes.com.br", "phone": "(11) 3456-7890", "city": "São Paulo", "state": "SP", "credit_limit": 50000},
        {"customer_type": CustomerType.PF, "name": "Maria Oliveira", "document": "987.654.321-00", "email": "maria@email.com", "phone": "(11) 98765-4321", "city": "Guarulhos", "state": "SP", "credit_limit": 3000},
        {"customer_type": CustomerType.PF, "name": "Pedro Santos", "document": "456.789.123-00", "email": "pedro@email.com", "phone": "(11) 95678-1234", "city": "Osasco", "state": "SP", "credit_limit": 2000},
        {"customer_type": CustomerType.PJ, "name": "Arquitetura & Design SS", "company_name": "A&D Arquitetura", "document": "98.765.432/0001-10", "email": "contato@adarquitetura.com", "phone": "(11) 3123-4567", "city": "São Paulo", "state": "SP", "credit_limit": 25000},
    ]
    for cust_data in customers_data:
        customer = Customer(**cust_data)
        db.add(customer)

    suppliers_data = [
        {"company_name": "Cimenteira Nacional S/A", "cnpj": "11.111.111/0001-11", "email": "vendas@cimenteira.com.br", "phone": "(11) 3000-1111", "city": "São Paulo", "state": "SP", "payment_terms": "30 dias", "delivery_days": 7},
        {"company_name": "Madeireira Pinho Forte", "cnpj": "22.222.222/0001-22", "email": "comercial@pinho-forte.com.br", "phone": "(11) 3000-2222", "city": "Sorocaba", "state": "SP", "payment_terms": "28 dias", "delivery_days": 10},
        {"company_name": "Ferramentas Becker Ltda", "cnpj": "33.333.333/0001-33", "email": "vendas@beckertools.com.br", "phone": "(11) 3000-3333", "city": "São Bernardo", "state": "SP", "payment_terms": "30 dias", "delivery_days": 5},
        {"company_name": "Tintas Colorama Indústria", "cnpj": "44.444.444/0001-44", "email": "pedidos@colorama-tintas.com.br", "phone": "(11) 3000-4444", "city": "Campinas", "state": "SP", "payment_terms": "45 dias", "delivery_days": 8},
        {"company_name": "Hidrocenter Tubos e Conexões", "cnpj": "55.555.555/0001-55", "email": "comercial@hidrocenter.com.br", "phone": "(11) 3000-5555", "city": "São Paulo", "state": "SP", "payment_terms": "30 dias", "delivery_days": 3},
    ]
    for supp_data in suppliers_data:
        supplier = Supplier(**supp_data)
        db.add(supplier)

    loyalty = LoyaltyProgram(
        name="ConstruGest Fidelidade",
        points_per_real=1,
        min_points_redeem=100,
        points_per_reais=0.05,
        is_active=True
    )
    db.add(loyalty)

    db.commit()
    db.close()
    print("Seed concluído com sucesso!")
    print("\nUsuários criados:")
    print("  Admin:     admin / admin123")
    print("  Vendedor:  vendedor1 / vendedor123")
    print("  Estoquista: estoquista1 / estoque123")
    print(f"\n{len(categories_data)} categorias criadas")
    print(f"{len(products_data)} produtos criados")
    print(f"{len(customers_data)} clientes criados")
    print(f"{len(suppliers_data)} fornecedores criados")
    print("1 programa de fidelidade criado")

if __name__ == "__main__":
    seed()
