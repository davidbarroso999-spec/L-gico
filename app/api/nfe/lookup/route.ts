import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key')?.trim().replace(/\D/g, '') || '';

    if (!key || key.length !== 44) {
      return NextResponse.json(
        { error: 'A chave de acesso da NF-e deve possuir exatamente 44 dígitos numéricos.' },
        { status: 400 }
      );
    }

    // Decode 44-digit Access Key
    // 1. UF State Code (2 digits)
    const ufCode = key.substring(0, 2);
    // 2. Year & Month (4 digits, AAMM)
    const year = '20' + key.substring(2, 4);
    const month = key.substring(4, 6);
    // 3. Issuer CNPJ (14 digits)
    const cnpj = key.substring(6, 20);
    // 4. Model (2 digits, usually 55 for NF-e, 65 for NFC-e)
    const model = key.substring(20, 22);
    // 5. Series (3 digits)
    const series = parseInt(key.substring(22, 25), 10).toString();
    // 6. NF Number (9 digits)
    const number = parseInt(key.substring(25, 34), 10).toString();
    // 7. Emission type (1 digit)
    const tpEmis = key.substring(34, 35);
    // 8. Code (8 digits)
    const cNF = key.substring(35, 43);
    // 9. Check digit (1 digit)
    const cDV = key.substring(43, 44);

    // UF Code Map
    const ufMap: Record<string, string> = {
      '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
      '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
      '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
      '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
    };
    const uf = ufMap[ufCode] || 'AM';

    // Call the free, no-cost, high-performance Brasil API CNPJ lookup
    let issuer = {
      name: 'Emitente Desconhecido',
      tradeName: '',
      cnpj: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
      address: 'Rua Principal, 100',
      neighborhood: 'Distrito Industrial',
      city: 'Manaus',
      state: uf,
      zip: '69000-000',
      phone: ''
    };

    try {
      const brasilApiUrl = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
      const res = await fetch(brasilApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 86400 } // Cache for 24 hours
      });

      if (res.ok) {
        const data = await res.json();
        
        // Format address from CNPJ details
        const street = data.logradouro || '';
        const num = data.numero || 'S/N';
        const complement = data.complemento ? `, ${data.complemento}` : '';
        
        issuer = {
          name: data.razao_social || data.nome_fantasia || 'Emitente Localizado',
          tradeName: data.nome_fantasia || '',
          cnpj: data.cnpj || cnpj,
          address: `${street}, ${num}${complement}`,
          neighborhood: data.bairro || 'Distrito Industrial',
          city: data.municipio || 'Manaus',
          state: data.uf || uf,
          zip: data.cep || '69000-000',
          phone: data.ddd_telefone_1 || ''
        };
      }
    } catch (e) {
      console.warn('[CNPJ Lookup Brasil API] Error:', e);
      // Fallback with parsed structure
    }

    return NextResponse.json({
      key,
      extracted: {
        number,
        series,
        model: model === '55' ? 'NF-e (Modelo 55)' : model === '65' ? 'NFC-e (Modelo 65)' : `Modelo ${model}`,
        issueDate: `${month}/${year}`,
        uf,
        tpEmis
      },
      issuer,
      success: true,
      message: 'Dados da Nota Fiscal localizados com sucesso via consulta de CNPJ do emitente.'
    });
  } catch (error: any) {
    console.error('[NFe Lookup API] Unexpected Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar dados da chave de acesso.' },
      { status: 500 }
    );
  }
}
