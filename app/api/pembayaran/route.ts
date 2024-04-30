import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { cookies } from 'next/headers'
import { verifyAuth } from '@/lib/auth';


export async function POST(req: NextRequest) { 
  try {
    const body = await req.json();

    let userAuth : string = "";
    let loketAuth : string = "";
    let passAuth : string = "";

    const authHeader = req.headers.get('Authorization');
    const tokenHeader = authHeader?.replace("Bearer ","") || "";

    const isVerif  = await verifyAuth(tokenHeader);
    if (isVerif.status) {
      userAuth = isVerif.data?.user || "";
      loketAuth = isVerif.data?.kodeloket || "";  
      passAuth =  isVerif.data?.pass || "";     
    } else {
      return NextResponse.json(
        { success: false,
          rescode : 401,
          message: 'Screet Key failed' },
        { status: 401 }
      )     
    }
       // cek user verifikasi
    const isVerifUser =  await prismadb.userakses.findUnique({
      where : {
        namauser : userAuth,
        passworduser : passAuth,
        kodeloket : loketAuth
      }
    });
    if (!isVerifUser) {
      return NextResponse.json(
        {
          rescode : 210,
          success : false,
          message : "User Tidak Terdaftar",
          data : {
            namauser : userAuth,
            passworduser : passAuth,
            kodeloket : loketAuth
          }
        }

        ,{status : 200})  
    }
    
    if (!body.periode || !body.no_pelanggan)  {
      return NextResponse.json(
        { 
          rescode : 310,
          success: false,
          message: 'Data Body Invalid' },
        { status: 200 }
      )         
    }

    const isPelcoklit = await prismadb.pel_coklit.findUnique({
      where : {
        nosamb : body.no_pelanggan || ""
      }
    })
    if (!isPelcoklit) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Coklit Tidak Terdaftar",
          data : {
            nopel : body.no_pelanggan || ""
          }
        }

        ,{status : 200})  
    }
    const isPel = await prismadb.pelanggan.findUnique({
      where : {
        nosamb :  body.no_pelanggan || "",
      }
    })
    if (!isPel) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Tidak Terdaftar",
          data : {
            nopel : body.no_pelanggan || "" 
          }
        }

        ,{status : 200})  
    }
    if (isPel.aktif === "0") {
      return NextResponse.json(
        {
          rescode : 212,
          success : false,
          message : "No Pelanggan Non Aktif, Harap Ke Kantor PDAM",
          data : {
            nopel : body.no_pelanggan || "" 
          }
        }

        ,{status : 200})        
    }
    
    const datatagihan : any[] = await prismadb.$queryRaw(
      // Prisma.sql`call infotag_b_byr(${body.no_pelanggan},${userAuth})`
      
      Prisma.sql`call infotag_coklit(${body.no_pelanggan},${body.periode})`
    )
    
    // console.log(datatagihan)
    if (!datatagihan || datatagihan.length === 0) {
      return NextResponse.json(
        {
          rescode : 215,
          success : false,
          message : "Tagihan Sudah Lunas",
          data : {
            nopel : body.no_pelanggan || "" 
          }
        }

        ,{status : 200})  
    }

        
    // const jmlperiode = body.periode.length;

    // const jmldataTagihan = datatagihan.length;
    
    // if (jmldataTagihan !== jmlperiode) {
    //   return NextResponse.json(
    //     {
    //       rescode : 311,
    //       success : false,
    //       message : "Jumlah Periode Tagihan Invalid",
    //       data : {
    //         periode : body.periode 
    //       }
    //     }

    //     ,{status : 200})  

    // }

    // const periodeTagihan = datatagihan.map(val => {
    //   return val.f5;
    // })

    // const periodeBody = body.periode;
    // periodeBody.sort();
    // periodeTagihan.sort();
    // const isMatchPeriodeData = (JSON.stringify(periodeBody) === JSON.stringify(periodeTagihan));

    // if (!isMatchPeriodeData) {
    //   return NextResponse.json(
    //     {
    //       rescode : 312,
    //       success : false,
    //       message : "Data Periode Tagihan Invalid",
    //       data : {
    //         periode : periodeBody
    //       }
    //     }

    //     ,{status : 200})  
    // }
    // // console.log(datatagihan)

    let dataStsBayar =  [];

    for (const dataTag of datatagihan) {
      const totalBayar = dataTag.f31;
      const nosamb = dataTag.f1;
      const dendatunggakan = dataTag.f29;
      const total = dataTag.f31;
      const kode = `${dataTag.f5}.${dataTag.f1}`;
      const periode = dataTag.f5; 
      console.log(kode);
      try {
        
        const isBayar : any [] = await prismadb.$queryRaw(
          Prisma.sql`call bayar_coklit(${userAuth},${passAuth},${loketAuth},${totalBayar},${nosamb},${dendatunggakan},${total},${kode},${periode})` 
        )

        if (isBayar[0].f0 ==="015") {
        
          const dumpDt = {
            periode : periode,
            status : "OK"
          }
          dataStsBayar.push(dumpDt)
        } else {
          const dumpDt = {
            periode : periode,
            status : "GAGAL"
          }
          dataStsBayar.push(dumpDt);
        }

      } catch (error) {
        const dumpDt = {
          periode : periode,
          status : "ERROR"
        }   
        dataStsBayar.push(dumpDt);     
      }      
    }

    console.log(dataStsBayar)

    dataStsBayar.reverse()

  

    const result = 
    {
      rescode : 300,
      success : true,
      message : "Pembayaran Sukses",
      data : {

        no_pelanggan : isPel.nosamb,
        periode :  dataStsBayar
      }
    }



    return NextResponse.json(result,{status : 200})   

  } catch (error) {
    return NextResponse.json({
      rescode : 500,
      success : false,
      message : `General Error : ${error}`
    }, { status: 500 })
  }


}
