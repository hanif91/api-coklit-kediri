import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { cookies } from 'next/headers'
import { verifyAuth } from '@/lib/auth';


export async function GET(req: NextRequest) { 
  try {
    console.log('tesad')
    let userAuth : string = "";
    let loketAuth : string = "";
    let passAuth : string = "";

    const [periode] = req.url.split('/').slice(-1);


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
    console.log(periode);
    const datatagihan : any[] = await prismadb.$queryRaw(
      // Prisma.sql`call infotag_b_byr(${body.no_pelanggan},${userAuth})`
      
      Prisma.sql`call infotag_coklit_all(${periode})`
    )
    
    // console.log(datatagihan)
    if (!datatagihan || datatagihan.length === 0) {
      return NextResponse.json(
        {
          rescode : 215,
          success : false,
          message : "Tagihan tidak ada",
          data : {
            periode : periode 
          }
        }

        ,{status : 200})  
    }



    const resbayar =  datatagihan.map ((val) =>{
      const res = {
            no_pelanggan : val.f1,
            nama : val.f2.trim(),
            alamat : val.f3.trim(),
            periode : val.f5 ,
            golongan : val.f7 ,
            stanlalu : parseInt(val.f10),
            stanini : parseInt(val.f11),
            pakaim3 : parseInt(val.f13),
            hargaair : parseInt(val.f20),
            adminpdam : parseInt(val.f21),
            danameter : parseInt(val.f22),
            retribusi : parseInt(val.f23),
            denda : parseInt(val.f29),
            total : parseInt(val.f31)            
          }
      
      return res;
      }
    );

    const result = 
    {
      rescode : 200,
      success : true,
      message : "Tagihan Tersedia",
      data : resbayar
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
