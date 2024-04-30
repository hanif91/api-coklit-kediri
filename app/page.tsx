import Image from 'next/image'

export default function Home() {
  const res =  {
    app : "API Coklit Perumda Air Minum Tirta Dhaha Kota Kediri",
    versi : "Versi 1.0"
  }

  const result = JSON.stringify(res);
  return (result)
}
