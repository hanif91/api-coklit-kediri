import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { cookies } from 'next/headers'
import { verifyAuth } from '@/lib/auth';


export async function GET(req: NextRequest) { 
  try {
    let userAuth : string = "";
    let loketAuth : string = "";
    let passAuth : string = "";

    const authHeader = req.headers.get('Authorization');
    const tokenHeader = authHeader?.replace("Bearer ","") || "";

    const [nopel, periode] = req.url.split('/').slice(-2);

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
    
    const isPelcoklit = await prismadb.pel_coklit.findUnique({
      where : {
        nosamb :  nopel || ""
      }
    })
    if (!isPelcoklit) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Coklit Tidak Terdaftar",
          data : {
            nopel : nopel || ""
          }
        }

        ,{status : 200})  
    }

    const isPel = await prismadb.pelanggan.findUnique({
      where : {
        nosamb :  nopel || "",
      }
    })
    if (!isPel) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Tidak Terdaftar",
          data : {
            nopel : nopel || "" 
          }
        }

        ,{status : 200})  
    }
    
    const datatagihan : any[] = await prismadb.$queryRaw(
      Prisma.sql`call infobayar_coklit(${nopel},${periode})` 
    )
    
    if (!datatagihan || datatagihan.length === 0) {
      return NextResponse.json(
        {
          rescode : 401,
          success : false,
          message : "Tidak Ada Data atau Belum Lunas",
          data : {
            nopel : nopel || "" 
          }
        }

        ,{status : 200})  
    }
    console.log(datatagihan);
    datatagihan.reverse()
    
    const resultDataTag = datatagihan.map(val => {
  
      const res = {
        periode : val.f2 ,
        golongan : val.f5 ,
        stanlalu : parseInt(val.f7),
        stanini : parseInt(val.f8),
        pakaim3 : parseInt(val.f10),
        hargaair : parseInt(val.f16),
        adminpdam : parseInt(val.f28),
        danameter : parseInt(val.f27),
        retribusi : parseInt(val.f29),
        denda : parseInt(val.f26),
        total : parseInt(val.f23),
        user : val.f30
      }

      return res;
    })

    const result = 
    {
      rescode : 400,
      success : true,
      message : "Info Pembayaran Tersedia",
      data : {
        no_pelanggan : isPel.nosamb.trim(),
        nama : isPel.nama?.trim(),
        alamat : isPel.alamat?.trim(),
        tagihan : resultDataTag
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
