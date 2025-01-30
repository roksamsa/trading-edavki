"use client";

import React, { useState } from "react";
import { read, utils } from "xlsx";
import { saveAs } from "file-saver";
import { Tabs, Tab } from "@heroui/tabs";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";

const taxPayerTypes = [
  { key: "FO", label: "Fizična oseba" },
  { key: "PO", label: "Pravna oseba" },
  { key: "SP", label: "Fizična oseba z dejavnostjo" },
];

const tradingPlatforms = [
  { key: "DEGIRO", label: "DEGIRO" },
  { key: "IBKR", label: "Interactive Brokers" },
  { key: "TR", label: "Trading212" },
  { key: "ET", label: "Etoro" },
  { key: "RO", label: "Revolut" },
  { key: "OT", label: "Ostalo" },
];

export default function Home() {
  const [selectedTradingPlatform, setSelectedTradingPlatform] =
    useState<string>("ET");
  const [selectedTaxPayerType, setSelectedTaxPayerType] =
    useState<string>("FO");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear() - 1,
  );
  const [taxNumber, setTaxNumber] = useState<string>("");

  const [pageTabs, setPageTabs] = useState<string[]>([]);
  const [dividendsData, setDividendsData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];

    if (!file) {
      alert("Please upload an XLSX file first.");

      return;
    }

    const data = await file.arrayBuffer();
    const workbook = read(data, { type: "array" });
    const sheetName = "Dividends";

    setPageTabs(Object.keys(workbook.Sheets));

    if (!workbook.Sheets[sheetName]) {
      setError(`Sheet "${sheetName}" not found in the uploaded file.`);

      return;
    }

    console.log("11111", workbook.Sheets);

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    console.log("Extracted Data:", jsonData);
    setDividendsData(jsonData);
  };

  const handleGenerateXML = async () => {
    const xmlData = generateXML(dividendsData);
    const blob = new Blob([xmlData], { type: "application/xml" });

    saveAs(blob, "Doh-Div.xml");
  };

  const generateXML = (data: any) => {
    const header = `<?xml version="1.0" ?>
<Envelope xmlns="http://edavki.durs.si/Documents/Schemas/Doh_Div_3.xsd" xmlns:edp="http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd">
	<edp:Header>
		<edp:taxpayer>
			<edp:taxNumber>${taxNumber}</edp:taxNumber>
			<edp:taxpayerType>${selectedTaxPayerType}</edp:taxpayerType>
		</edp:taxpayer>
		<edp:Workflow>
			<edp:DocumentWorkflowID>O</edp:DocumentWorkflowID>
		</edp:Workflow>
	</edp:Header>
	<edp:AttachmentList/>
	<edp:Signatures/>
	<body>
		<Doh_Div>
			<Period>${selectedYear}</Period>
		</Doh_Div>`;

    const dividends = data
      .map((row: any) => {
        return `
		<Dividend>
			<Date>${row.Date}</Date>
			<PayerIdentificationNumber>${
        row.PayerIdentificationNumber
      }</PayerIdentificationNumber>
			<PayerName>${row.PayerName}</PayerName>
			<PayerAddress>${row.PayerAddress}</PayerAddress>
			<PayerCountry>${row.PayerCountry}</PayerCountry>
			<Type>${row.Type}</Type>
			<Value>${row.__EMPTY || "0"}</Value>
			<ForeignTax>${row.ForeignTax}</ForeignTax>
			<SourceCountry>${row.SourceCountry}</SourceCountry>
			<ReliefStatement/>
		</Dividend>`;
      })
      .join("");

    const footer = `
	</body>
</Envelope>`;

    return header + dividends + footer;
  };

  return (
    <div className="page flex p-6">
      <div className="page__left-sidebar">
        <Input
          className="mb-5"
          label="Davčna številka"
          placeholder="Davčna številka"
          type="text"
          value={taxNumber}
          onChange={(event) => setTaxNumber(event.target.value)}
        />
        <Select
          className="max-w-xs mb-5"
          isDisabled
          label="Izberi borzno platformo"
          selectedKeys={[selectedTradingPlatform]}
          onChange={(event) => setSelectedTradingPlatform(event.target.value)}
        >
          {tradingPlatforms.map((platform) => (
            <SelectItem key={platform.key}>{platform.label}</SelectItem>
          ))}
        </Select>
        <Select
          className="max-w-xs mb-5"
          label="Izberi tip davkoplačevalca"
          selectedKeys={[selectedTaxPayerType]}
          onChange={(event) => setSelectedTaxPayerType(event.target.value)}
        >
          {taxPayerTypes.map((taxPayerType) => (
            <SelectItem key={taxPayerType.key}>{taxPayerType.label}</SelectItem>
          ))}
        </Select>
        <Input
          label="Za leto"
          placeholder="Za leto"
          type="number"
          value={selectedYear.toString()}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
        />
        <div className="divider"></div>
        <Input
          accept=".xlsx"
          label="Upload XLSX file"
          placeholder="Upload XLSX file"
          type="file"
          onChange={handleFileUpload}
        />
      </div>
      <div className="page__content">
        <div className="flex flex-col">
          <div className="page__headline flex justify-between items-center">
            <Tabs aria-label="Options">
              {pageTabs.map((tab) => (
                <Tab key={tab} title={tab}></Tab>
              ))}
            </Tabs>
            <button
              onClick={handleGenerateXML}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Generate XML
            </button>
          </div>
          <div className="page__content-container">
            {dividendsData?.length > 0 && (
              <>
                <h2 className="text-lg font-bold">Dividends Data</h2>
                <table className="table-auto border-collapse border border-gray-300 w-full text-sm text-left">
                  <thead>
                    <tr>
                      {Object.keys(dividendsData[0]).map((key) => (
                        <th
                          key={key}
                          className="border border-gray-300 p-2 bg-gray-200"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dividendsData.map((row, index) => (
                      <tr key={index}>
                        {Object.keys(row).map((key) => (
                          <td
                            key={key}
                            className="border border-gray-300 p-2 text-gray-700"
                          >
                            {row[key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
