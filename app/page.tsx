"use client";

import React, { useEffect, useState } from "react";
import { read, utils } from "xlsx";
import { saveAs } from "file-saver";
import { Tabs, Tab } from "@heroui/tabs";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { MdClose } from "react-icons/md";
import { AiOutlineStock } from "react-icons/ai";

import { ReactGrid, Column, Row } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";

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

const currentYear = new Date().getFullYear();

const sheetToJsonOptions = {
  blankrows: false,
  defval: "",
};

export default function Home() {
  const [selectedTradingPlatform, setSelectedTradingPlatform] =
    useState<string>("ET");
  const [selectedTaxPayerType, setSelectedTaxPayerType] =
    useState<string>("FO");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear - 1);
  const [taxNumber, setTaxNumber] = useState<string>("");

  const [pageTabs, setPageTabs] = useState<any[]>([]);
  const [selectedPageTab, setSelectedPageTab] = useState<string>("Dividends");
  const [selectedPageTableColumns, setSelectedPageTableColumns] =
    useState<Column[]>();
  const [selectedPageTabContent, setSelectedPageTabContent] = useState<any>();

  const [importedDataFileDetails, setImportedDataFileDetails] = useState<any>();
  const [importedData, setImportedData] = useState<any[]>();
  const [dividendsData, setDividendsData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleGenerateXML = async () => {
    const xmlData = generateXML(dividendsData);
    const blob = new Blob([xmlData], { type: "application/xml" });

    saveAs(blob, "Doh-Div.xml");
  };

  const handleGenerateContent = async (companyName: string) => {
    const prompt = `Fill missing ISIN for the following ${companyName} common stock on all markets. If there are multiple options, give me all ISINs. And can you just return ISIN string not whole sentence`;

    try {
      const res = await fetch("/api/generative-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await res.json();

      return data;
    } catch (err) {
      console.error("Error generating content:", err);
    }
  };

  const handleFillMissingISIN = async () => {
    const selectedPageTabContentEdited = await Promise.all(
      selectedPageTabContent.map(async (row: any) => {
        if (!row.ISIN) {
          const generatedISIN = await handleGenerateContent(
            row["Instrument Name"],
          );

          row.ISIN = generatedISIN.response.replace(/\n/g, "");
        }

        return row;
      }),
    );

    console.log("selectedPageTabContentEdited", selectedPageTabContentEdited);

    setSelectedPageTabContent(selectedPageTabContentEdited);
  };

  useEffect(() => {
    if (importedData && importedData.length > 0 && selectedPageTab) {
      const selectedPageTabData = pageTabs.find(
        (tab) => tab.label === selectedPageTab,
      );
      const worksheet = importedData[selectedPageTabData?.index];
      const importedDataJson: any[] = utils.sheet_to_json(worksheet?.data);
      const columns: Column[] = importedDataJson?.[0]?.map((key) => ({
        columnId: key,
        width: 150,
      }));

      console.log("worksheetworksheet", worksheet);
      console.log("selectedPageTabData", selectedPageTabData);
      console.log("importedDataJson", importedDataJson);
      console.log("importedData", importedData);
      console.log("columns", columns);

      setSelectedPageTabContent(importedDataJson);
      setSelectedPageTableColumns(columns);
    }
  }, [selectedPageTab, importedData]);

  useEffect(() => {
    console.log("selectedPageTabContent", selectedPageTabContent);
  }, [selectedPageTabContent]);

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

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    // setIsDragging(false);
  };

  const processFile = async (file) => {
    if (!file) {
      alert("Please upload an XLSX file first.");

      return;
    }

    const data = await file.arrayBuffer();
    const workbook = read(data, { type: "array" });
    const sheetName = "Dividends";
    const sheetsKeys = Object.keys(workbook.Sheets).map((key, index) => ({
      index,
      label: key,
    }));

    setPageTabs(sheetsKeys);

    if (!workbook.Sheets[sheetName]) {
      setError(`Sheet "${sheetName}" not found in the uploaded file.`);

      return;
    }

    const sheetsArray: any[] = Object.values(workbook.Sheets).map(
      (sheet, index) => {
        const sheetJson: any[] = utils.sheet_to_json(sheet, sheetToJsonOptions);

        return {
          name: sheetsKeys[index],
          data: sheetJson,
        };
      },
    );

    console.log("rrrrrrrrrrrrrrrrrsheetsArraysheetsArray", sheetsArray);

    setImportedData(sheetsArray);
    setImportedDataFileDetails(file);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;

    if (files.length > 0) {
      console.log("File dropped:", files[0]); // Process the file here
    }

    const file = files[0];

    await processFile(file);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    await processFile(file);
  };

  const handleRemoveImportedData = () => {
    setImportedDataFileDetails(null);
    setSelectedPageTabContent(null);
    setImportedData([]);
  };

  useEffect(() => {
    if (importedData && selectedPageTab) {
      const selectedPageTabData = pageTabs.find(
        (tab) => tab.label === selectedPageTab,
      );
      const worksheet = importedData[selectedPageTabData.index];

      setSelectedPageTabContent(worksheet.data);
    }
  }, [selectedPageTab, importedData]);

  return (
    <div
      className="page flex"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="page__left-sidebar p-6">
        {!importedData ? (
          <>
            <Input
              accept=".xlsx"
              className="page__left-upload"
              label="Upload XLSX file"
              placeholder="Upload XLSX file"
              type="file"
              onChange={handleFileUpload}
            />
          </>
        ) : (
          <div className="page__left-title" onClick={handleRemoveImportedData}>
            <div className="page__left-text">
              <p className="page__left-label text-small">Datoteka</p>
              <p className="page__left-name-wrapper">
                <span className="page__left-name">
                  {importedDataFileDetails?.name}
                </span>
              </p>
            </div>
            <span className="page__left-size text-small">
              <p className="page__left-label text-small">
                {importedDataFileDetails?.lastModifiedDate.toLocaleDateString()}
              </p>
              <p className="page__left-label text-small">
                {Math.round(importedDataFileDetails?.size / 1024)} KB
              </p>
            </span>
            <div className="page__left-cancel">
              <MdClose />
            </div>
          </div>
        )}
        <div className="divider"></div>
        <Input
          className="mb-5"
          label="Davčna številka"
          placeholder="Davčna številka"
          type="text"
          value={taxNumber}
          onChange={(event) => setTaxNumber(event.target.value)}
        />
        <Select
          className="mb-5"
          isDisabled
          fullWidth={true}
          label="Izberi borzno platformo"
          selectedKeys={[selectedTradingPlatform]}
          onChange={(event) => setSelectedTradingPlatform(event.target.value)}
        >
          {tradingPlatforms.map((platform) => (
            <SelectItem key={platform.key}>{platform.label}</SelectItem>
          ))}
        </Select>
        <Select
          className="mb-5"
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
          onChange={(event) =>
            setSelectedYear(
              Math.min(currentYear - 1, parseInt(event.target.value)),
            )
          }
        />
        <footer className="grow w-full flex items-end justify-center py-3">
          <p>
            Made by <a href="https://roksamsa.com/en/">Rok Samsa</a>
          </p>
        </footer>
      </div>
      <div className="page__content p-6">
        <div className="page__headline flex justify-between items-center">
          <div className="page__headline-tabs">
            {importedData && (
              <Tabs
                aria-label="Options"
                selectedKey={selectedPageTab}
                onSelectionChange={(event) =>
                  setSelectedPageTab(event.toString())
                }
              >
                {pageTabs.map((tab) => (
                  <Tab key={tab.label} title={tab.label}></Tab>
                ))}
              </Tabs>
            )}
          </div>
          <Button
            isDisabled={!importedData}
            disabled={!importedData}
            onPress={handleFillMissingISIN}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-3"
          >
            Fill missing ISIN
          </Button>
          <Button
            isDisabled={!importedData}
            disabled={!importedData}
            onPress={handleGenerateXML}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Generate XML
          </Button>
        </div>
        {selectedPageTabContent?.length > 0 && (
          <h2 className="text-2xl font-bold mb-4">{selectedPageTab}</h2>
        )}
        <div
          className={`page__content-container ${!selectedPageTabContent && "flex items-center justify-center"}`}
        >
          {selectedPageTabContent?.length > 0 ? (
            <>
              <table className="table-auto border-collapse border border-gray-300 w-full text-sm text-left">
                <thead>
                  <tr>
                    {Object.keys(selectedPageTabContent[0]).map((key) => (
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
                  {selectedPageTabContent.map((row, index) => (
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
          ) : (
            <div className="flex flex-col items-center text-center text-gray-300">
              <AiOutlineStock size={60} />
              <p>No file imported yet!</p>
            </div>
          )}
        </div>
      </div>
      {isDragging && (
        <div
          className="absolute inset-0 bg-blue-500/50 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          <div className="text-xl font-bold">Drop your file here!</div>
        </div>
      )}
    </div>
  );
}
