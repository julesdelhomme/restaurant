import { AdminTabsBar } from "./AdminTabsBar";
import { FormulaComposerModal } from "./FormulaComposerModal";
import { FormulaOptionSelectionModal } from "./FormulaOptionSelectionModal";
import { KitchenNoteModal } from "./KitchenNoteModal";
import { NewOrderSection } from "./NewOrderSection";
import { OptionSelectionModal } from "./OptionSelectionModal";
import { PendingNotificationsPanel } from "./PendingNotificationsPanel";
import { PreparingOrderCard } from "./PreparingOrderCard";
import { ReadyOrdersSection } from "./ReadyOrdersSection";
import { TableSessionsSection } from "./TableSessionsSection";
import { TableStatusSection } from "./TableStatusSection";
import { SERVICE_STEP_LABELS } from "../utils/formula-workflow-helpers";

type AdminContentViewProps = Record<string, any>;

export function AdminContentView(props: AdminContentViewProps) {
  const {
    disableClientOrderingEnabled,
    restaurantSettingsError,
    pendingNotifications,
    markNotificationRead,
    showNewOrderTab,
    resolvedActiveTab,
    hasReadyTabAlert,
    setActiveTab,
    setKitchenNoteOpen,
    kitchenNoteOpen,
    kitchenNoteFeedback,
    kitchenNoteText,
    kitchenNoteSending,
    setKitchenNoteText,
    handleSendKitchenNote,
    tableSelectOptions,
    selectedFastTableNumber,
    fastCoversInput,
    fastItemCount,
    fastTotal,
    categoriesForFastEntry,
    effectiveSelectedFastCategoryKey,
    visibleFastEntryDishes,
    formulaParentDishIds,
    dishIdsWithLinkedExtras,
    fastLines,
    fastLoading,
    fastMessage,
    canSubmitFastOrder,
    handleFastTableSelection,
    handleFastCoversDecrement,
    handleFastCoversIncrement,
    setFastCoversInput,
    setSelectedCategory,
    handleSelectDish,
    removeFastLine,
    updateLineKitchenComment,
    handleSubmitFastOrder,
    readBooleanFlag,
    getFormulaDisplayName,
    getDishName,
    getFormulaPackPrice,
    getDishPrice,
    dishNeedsCooking,
    parseDishProductOptions,
    parseDishExtras,
    parseDishSideIds,
    resolveFastLineUnitPrice,
    buildLineInstructions,
    tableNumberInput,
    pinInput,
    coversInput,
    saving,
    message,
    configuredTotalTables,
    tableSlots,
    setTableNumberInput,
    setPinInput,
    setCoversInput,
    handleSessionCoversDecrement,
    handleSessionCoversIncrement,
    handleSaveTable,
    readCoversFromRow,
    fillFormForEdit,
    handleDeleteTable,
    preparingOrders,
    tableCoversByNumber,
    readyAlertOrderIds,
    normalizeCoversValue,
    resolveOrderItemLabel,
    normalizeLookupText,
    parseItems,
    isItemServed,
    hasExplicitItemStatus,
    normalizeWorkflowItemStatus,
    getItemPrepStatus,
    isPreparingLikeOrderStatus,
    isDrink,
    isFormulaOrderItem,
    resolveOrderServiceStep,
    summarizeItems,
    getItemStatusLabel,
    getItemStatusClass,
    readyOrders,
    getReadyItemEntries,
    handleServeItems,
    tableStatusRows,
    sendingNextStepOrderIds,
    handleSendNextServiceStep,
    dishes,
    formulaToConfig,
    configModalOpen,
    formulaModalOpen,
    formulaModalDish,
    closeFormulaModal,
    formulaUi,
    formulaCategories,
    formulaStepGroups,
    getCategoryLabel,
    formulaNoDishesMessageByCategory,
    formulaOptionsByCategory,
    formulaModalSelections,
    resolveFormulaDishRecord,
    dishById,
    getFormulaDishConfig,
    getFormulaSelectionDetails,
    formulaDefaultOptionsByDishId,
    hasFormulaConfigOptionsForDish,
    formulaModalItemDetailsOpen,
    setFormulaModalItemDetailsOpen,
    openFormulaItemOptionsModal,
    getFormulaCompositionDishName,
    getDishCleanDescription,
    formulaItemDetailsLabel,
    formulaOptionsLabel,
    parsePriceNumber,
    formulaOptionLockedLabel,
    sideIdByAlias,
    setFormulaModalError,
    setFormulaModalSelectionDetails,
    formulaModalError,
    formulaAddDisabled,
    handleAddFormulaLine,
    formulaOptionModalCategoryId,
    formulaOptionModalOpen,
    formulaOptionModalDish,
    formulaOptionModalConfig,
    formulaOptionModalDetails,
    formulaOptionModalAllowMulti,
    formulaOptionModalDefaultOptionIds,
    formulaOptionModalMissingRequired,
    setFormulaOptionModalState,
    handleFormulaOptionModalProductChange,
    handleFormulaOptionModalSideToggle,
    handleFormulaOptionModalExtraToggle,
    handleFormulaOptionModalCookingChange,
    modalOpen,
    modalDish,
    modalQty,
    modalSideChoices,
    modalSelectedSides,
    modalProductOptions,
    modalSelectedProductOptionId,
    modalExtraChoices,
    modalSelectedExtras,
    modalCooking,
    modalKitchenComment,
    isProductOptionSelectionRequired,
    isSideSelectionRequired,
    setModalOpen,
    setModalQty,
    setModalSelectedProductOptionId,
    setModalSelectedSides,
    setModalSelectedExtras,
    setModalCooking,
    setModalKitchenComment,
    handleAddOptionLine,
    isDishesLoading,
    tableNumbers,
  } = props;

  if (!dishes || isDishesLoading) {
    return <div>Chargement...</div>;
  }
  if (dishes.length === 0 || tableNumbers.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center font-bold">
        Chargement des donnees de la salle...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black notranslate" translate="no" data-disable-client-ordering={disableClientOrderingEnabled ? "1" : "0"}>
      <h1 className="text-2xl font-bold mb-6 uppercase">Serveur</h1>
      {restaurantSettingsError ? (
        <div className="mb-4 rounded border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {restaurantSettingsError}
        </div>
      ) : null}

      <PendingNotificationsPanel pendingNotifications={pendingNotifications} markNotificationRead={markNotificationRead} />

      <AdminTabsBar
        showNewOrderTab={showNewOrderTab}
        resolvedActiveTab={resolvedActiveTab}
        hasReadyTabAlert={hasReadyTabAlert}
        onChangeTab={setActiveTab}
        onOpenKitchenNote={() => setKitchenNoteOpen(true)}
      />
      <KitchenNoteModal
        open={kitchenNoteOpen}
        feedback={kitchenNoteFeedback}
        text={kitchenNoteText}
        sending={kitchenNoteSending}
        onChangeText={setKitchenNoteText}
        onClose={() => {
          setKitchenNoteOpen(false);
          setKitchenNoteText("");
        }}
        onSend={() => void handleSendKitchenNote()}
      />

      {resolvedActiveTab === "new-order" ? (
        <NewOrderSection
          tableSelectOptions={tableSelectOptions}
          selectedFastTableNumber={selectedFastTableNumber}
          fastCoversInput={fastCoversInput}
          fastItemCount={fastItemCount}
          fastTotal={fastTotal}
          categoriesForFastEntry={categoriesForFastEntry}
          effectiveSelectedFastCategoryKey={effectiveSelectedFastCategoryKey}
          visibleFastEntryDishes={visibleFastEntryDishes}
          formulaParentDishIds={formulaParentDishIds}
          dishIdsWithLinkedExtras={dishIdsWithLinkedExtras}
          fastLines={fastLines}
          fastLoading={fastLoading}
          fastMessage={fastMessage}
          canSubmit={canSubmitFastOrder}
          onSelectTable={handleFastTableSelection}
          onDecrementCovers={handleFastCoversDecrement}
          onIncrementCovers={handleFastCoversIncrement}
          onCoversInputChange={setFastCoversInput}
          onSelectCategory={setSelectedCategory}
          onSelectDish={(dish: any) => void handleSelectDish(dish)}
          onRemoveFastLine={removeFastLine}
          onUpdateLineKitchenComment={updateLineKitchenComment}
          onSubmit={handleSubmitFastOrder}
          readBooleanFlag={readBooleanFlag}
          getFormulaDisplayName={getFormulaDisplayName}
          getDishName={getDishName}
          getFormulaPackPrice={getFormulaPackPrice}
          getDishPrice={getDishPrice}
          dishNeedsCooking={dishNeedsCooking}
          parseDishProductOptions={parseDishProductOptions}
          parseDishExtras={parseDishExtras}
          parseDishSideIds={parseDishSideIds}
          resolveFastLineUnitPrice={resolveFastLineUnitPrice}
          buildLineInstructions={buildLineInstructions}
        />
      ) : null}

      {resolvedActiveTab === "sessions" ? (
        <TableSessionsSection
          tableNumberInput={tableNumberInput}
          pinInput={pinInput}
          coversInput={coversInput}
          saving={saving}
          message={message}
          configuredTotalTables={configuredTotalTables}
          tableSlots={tableSlots}
          onChangeTableNumber={setTableNumberInput}
          onChangePin={setPinInput}
          onChangeCovers={setCoversInput}
          onDecrementCovers={handleSessionCoversDecrement}
          onIncrementCovers={handleSessionCoversIncrement}
          onSave={() => void handleSaveTable()}
          readCoversFromRow={readCoversFromRow}
          onEditTable={fillFormForEdit}
          onDeleteTable={(row: any) => void handleDeleteTable(row)}
        />
      ) : null}

      {resolvedActiveTab === "orders" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <section className="bg-amber-50 border-2 border-amber-300 p-4">
            <h2 className="text-xl font-bold mb-4 uppercase bg-amber-100 p-2 rounded">En préparation</h2>
            <div className="space-y-2">
              {preparingOrders.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune commande en préparation.</p>
              ) : (
                preparingOrders.map((order: any) => (
                  <PreparingOrderCard
                    key={`preparing-order-${order.id}`}
                    order={order}
                    tableCoversByNumber={tableCoversByNumber as Map<number, number>}
                    readyAlertOrderIds={readyAlertOrderIds}
                    serviceStepLabels={SERVICE_STEP_LABELS}
                    normalizeCoversValue={normalizeCoversValue}
                    resolveOrderItemLabel={resolveOrderItemLabel}
                    normalizeLookupText={normalizeLookupText}
                    parseItems={parseItems}
                    isItemServed={isItemServed}
                    hasExplicitItemStatus={hasExplicitItemStatus}
                    normalizeWorkflowItemStatus={normalizeWorkflowItemStatus}
                    getItemPrepStatus={getItemPrepStatus}
                    isPreparingLikeOrderStatus={isPreparingLikeOrderStatus}
                    isDrink={isDrink}
                    isFormulaOrderItem={isFormulaOrderItem}
                    resolveOrderServiceStep={resolveOrderServiceStep}
                    summarizeItems={summarizeItems}
                    getItemStatusLabel={getItemStatusLabel}
                    getItemStatusClass={getItemStatusClass}
                  />
                ))
              )}
            </div>
          </section>

          <ReadyOrdersSection
            readyOrders={readyOrders}
            getReadyItemEntries={getReadyItemEntries}
            isDrink={isDrink}
            normalizeCoversValue={normalizeCoversValue}
            tableCoversByNumber={tableCoversByNumber as Map<number, number>}
            resolveOrderItemLabel={resolveOrderItemLabel}
            handleServeItems={handleServeItems}
          />

          <TableStatusSection
            rows={tableStatusRows}
            sendingNextStepOrderIds={sendingNextStepOrderIds}
            handleSendNextServiceStep={handleSendNextServiceStep}
          />
        </div>
      ) : null}

      <FormulaComposerModal
        dishes={dishes}
        formulaToConfig={formulaToConfig}
        configModalOpen={configModalOpen}
        formulaModalOpen={formulaModalOpen}
        formulaModalDish={formulaModalDish}
        closeFormulaModal={closeFormulaModal}
        formulaUi={formulaUi}
        getFormulaDisplayName={getFormulaDisplayName}
        getFormulaPackPrice={getFormulaPackPrice}
        formulaCategories={formulaCategories}
        formulaStepGroups={formulaStepGroups}
        getCategoryLabel={getCategoryLabel}
        formulaNoDishesMessageByCategory={formulaNoDishesMessageByCategory}
        formulaOptionsByCategory={formulaOptionsByCategory}
        formulaModalSelections={formulaModalSelections}
        resolveFormulaDishRecord={resolveFormulaDishRecord}
        dishById={dishById}
        getFormulaDishConfig={getFormulaDishConfig}
        getFormulaSelectionDetails={getFormulaSelectionDetails}
        formulaDefaultOptionsByDishId={formulaDefaultOptionsByDishId}
        hasFormulaConfigOptionsForDish={hasFormulaConfigOptionsForDish}
        formulaModalItemDetailsOpen={formulaModalItemDetailsOpen}
        setFormulaModalItemDetailsOpen={setFormulaModalItemDetailsOpen}
        openFormulaItemOptionsModal={openFormulaItemOptionsModal}
        getFormulaCompositionDishName={getFormulaCompositionDishName}
        getDishCleanDescription={getDishCleanDescription}
        getDishPrice={getDishPrice}
        formulaItemDetailsLabel={formulaItemDetailsLabel}
        formulaOptionsLabel={formulaOptionsLabel}
        parsePriceNumber={parsePriceNumber}
        formulaOptionLockedLabel={formulaOptionLockedLabel}
        sideIdByAlias={sideIdByAlias}
        normalizeLookupText={normalizeLookupText}
        setFormulaModalError={setFormulaModalError}
        setFormulaModalSelectionDetails={setFormulaModalSelectionDetails}
        formulaModalError={formulaModalError}
        formulaAddDisabled={formulaAddDisabled}
        handleAddFormulaLine={handleAddFormulaLine}
      />

      <FormulaOptionSelectionModal
        open={formulaOptionModalOpen}
        dish={formulaOptionModalDish}
        categoryId={formulaOptionModalCategoryId}
        config={formulaOptionModalConfig}
        details={formulaOptionModalDetails}
        allowMulti={formulaOptionModalAllowMulti}
        defaultOptionIds={formulaOptionModalDefaultOptionIds}
        missingRequired={formulaOptionModalMissingRequired}
        optionsLabel={formulaOptionsLabel}
        optionLockedLabel={formulaOptionLockedLabel}
        getDishName={getFormulaCompositionDishName}
        parsePriceNumber={parsePriceNumber}
        mapSideLabelToId={(sideLabel: string) => sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel}
        onSetError={setFormulaModalError}
        onClose={() => setFormulaOptionModalState(null)}
        onProductOptionChange={handleFormulaOptionModalProductChange}
        onSideToggle={handleFormulaOptionModalSideToggle}
        onExtraToggle={handleFormulaOptionModalExtraToggle}
        onCookingChange={handleFormulaOptionModalCookingChange}
      />

      <OptionSelectionModal
        open={modalOpen}
        dish={modalDish}
        qty={modalQty}
        sideChoices={modalSideChoices}
        selectedSides={modalSelectedSides}
        productOptions={modalProductOptions}
        selectedProductOptionId={modalSelectedProductOptionId}
        extraChoices={modalExtraChoices}
        selectedExtras={modalSelectedExtras}
        cooking={modalCooking}
        kitchenComment={modalKitchenComment}
        getDishName={getDishName}
        getDishPrice={getDishPrice}
        parsePriceNumber={parsePriceNumber}
        isProductOptionSelectionRequired={isProductOptionSelectionRequired}
        isSideSelectionRequired={isSideSelectionRequired}
        dishNeedsCooking={dishNeedsCooking}
        setModalOpen={setModalOpen}
        setQty={setModalQty}
        setSelectedProductOptionId={setModalSelectedProductOptionId}
        setSelectedSides={setModalSelectedSides}
        setSelectedExtras={setModalSelectedExtras}
        setCooking={setModalCooking}
        setKitchenComment={setModalKitchenComment}
        onSubmit={handleAddOptionLine}
      />
    </div>
  );
}
